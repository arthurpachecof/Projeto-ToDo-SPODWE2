import { db } from '../configDB.js';


export function criarTabelaTodos() {
    db.run(`
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT NOT NULL PRIMARY KEY,
            texto TEXT NOT NULL,
            feito BOOLEAN NOT NULL DEFAULT 0
        )`
    );
}
// Função para criar a tabela de tags e a tabela de associação entre todos e tags
export function criarTabelaTags() {
    db.run(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE
        )`
    );
    db.run(`
        CREATE TABLE IF NOT EXISTS todo_tags (
            todo_id TEXT NOT NULL,
            tag_id INTEGER NOT NULL,
            FOREIGN KEY (todo_id) REFERENCES todos(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id),
            PRIMARY KEY (todo_id, tag_id)
        )`
    );
}

// Função para inserir ou obter uma tag
// tenta obter o ID de uma tag pelo nome se não encontrar, insere uma nova tag com esse nome e retorna o novo ID
function inserirOuObterTag(nome) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM tags WHERE nome = ?`, [nome], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(row.id);
            db.run(`INSERT INTO tags (nome) VALUES (?)`, [nome], function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
    });
}
// Função para associar tags a um todo
function associarTagsAoTodo(todoId, tags) {
    if (!tags || !Array.isArray(tags)) return Promise.resolve();
    return Promise.all(tags.map(async (tag) => {
        const tagId = await inserirOuObterTag(tag);
        return new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)`, [todoId, tagId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }));
}
// Função para buscar as tags associadas a um todo
function buscarTagsDoTodo(todoId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT t.nome FROM tags t
            JOIN todo_tags tt ON t.id = tt.tag_id
            WHERE tt.todo_id = ?
        `, [todoId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.nome));
        });
    });
}

// Listar todos (já tinha mas com tags agr)
export async function allTodos(req, res) {
    console.log('Token recebido:', req.user);
    const allTodos = await getAllTodos();
    const todosComTags = await Promise.all(allTodos.map(async (todo) => ({
        id: todo.id,
        texto: todo.texto,
        feito: Boolean(todo.feito),
        tags: await buscarTagsDoTodo(todo.id)
    })));
    return res.status(200).json(todosComTags);
}

// Criar todo (já tinha mas com tags agr)
export async function criaTodo(req, res) {
    const texto = req.body.texto ?? req.body.texto.trim();
    const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
    if (!texto || texto.length === 0) {
        return res.status(400).json({ error: "O texto é obrigatório" });
    }

    const idNovo = crypto.randomUUID();
    await new Promise((resolve, reject) => {
        insertTodo(idNovo, texto);
        resolve();
    });
    await associarTagsAoTodo(idNovo, tags);

    const novoTodo = await getTodoPorId(idNovo);
    const tagsDoTodo = await buscarTagsDoTodo(idNovo);

    return res.status(200).json({
        id: novoTodo.id,
        texto: novoTodo.texto,
        feito: Boolean(novoTodo.feito),
        tags: tagsDoTodo
    });
}

// Atualizar todo e tags (se modificado)
export async function atualizaTodo(req, res) {
    const id = req.params.id;
    const todo = await getTodoPorId(id);
    if (!todo) {
        return res.status(404).json({ error: "Todo não encontrado" });
    }

    const isTextoAtualizado = req.body.texto !== undefined && req.body.texto !== null;
    const isFeitoAtualizado = req.body.feito !== undefined && req.body.feito !== null;
    if (!isTextoAtualizado && !isFeitoAtualizado && !Array.isArray(req.body.tags)) {
        return res.status(400).json({ error: "Texto, Feito ou Tags são obrigatórios" });
    }

    const textoNovo = isTextoAtualizado ? req.body.texto.trim() : todo.texto;
    const feitoNovo = isFeitoAtualizado ? Number(req.body.feito) : todo.feito;
    if (isTextoAtualizado && textoNovo.length === 0) {
        return res.status(400).json({ error: "O texto não pode ser vazio" });
    }

    await new Promise((resolve, reject) => {
        updateTodo(id, textoNovo, feitoNovo);
        resolve();
    });

    // Atualizar tags se enviadas
    if (Array.isArray(req.body.tags)) {
        await new Promise((resolve, reject) => {
            db.run(`DELETE FROM todo_tags WHERE todo_id = ?`, [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        await associarTagsAoTodo(id, req.body.tags);
    }

    const todoAtualizado = await getTodoPorId(id);
    const tagsDoTodo = await buscarTagsDoTodo(id);

    return res.status(200).json({
        id: todoAtualizado.id,
        texto: todoAtualizado.texto,
        feito: Boolean(todoAtualizado.feito),
        tags: tagsDoTodo
    });
}

// Filtro por tag
export async function filtrarPorTag(req, res) {
    const tag = req.query.tag;
    if (!tag) return res.status(400).json({ error: "Tag é obrigatória" });

    db.all(`
        SELECT todos.* FROM todos
        JOIN todo_tags ON todos.id = todo_tags.todo_id
        JOIN tags ON tags.id = todo_tags.tag_id
        WHERE tags.nome = ?
    `, [tag], async (err, rows) => {
        if (err) return res.status(500).json({ error: "Erro ao buscar" });
        const todosComTags = await Promise.all((rows || []).map(async (todo) => ({
            id: todo.id,
            texto: todo.texto,
            feito: Boolean(todo.feito),
            tags: await buscarTagsDoTodo(todo.id)
        })));
        return res.status(200).json(todosComTags);
    });
}
// Funções que ja tinham
function getAllTodos() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM todos`, (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows || []);
        });
    });
}

function getTodoPorId(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM todos WHERE id = ?`, [id], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row || null);
        });
    });
}

function insertTodo(id, texto) {
    db.run(
        'INSERT INTO todos (id, texto, feito) VALUES (?, ?, 0)', 
        [id, texto]
    );
}

function updateTodo(id, texto, feito) {
    db.run(
        `UPDATE todos SET texto = ?, feito = ? WHERE id = ?`, 
        [texto, feito, id]
    );
}
