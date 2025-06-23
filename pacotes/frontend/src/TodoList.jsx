import { useState, useEffect } from "react";

const useAuth = () => {
  const [token, setToken] = useState(null);

  const login = async (email, senha) => {
    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, senha: senha }),
      });
      if (!response.ok) throw new Error('Login falhou');
  
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  return { token, login };
};

const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onLogin(email, senha);
    } catch (error) {
      setError("Email ou senha inválidos. Por favor, tente novamente.");
    }
  };

  return (
    <div className="containers">
      <div className="heading">Entrar</div>
      {error && <div className="error-message">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="input"
          required
        />
        <input
          placeholder="Password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
          className="input"
          required
        />
         <span className="forgot-password"><a href="#">Registre-se</a></span>
        <button type="submit" className="login-button">Login</button>
      </form>
    </div>
  );
};

const AddTodo = ({ addTodo, token }) => {
  const [texto, setTexto] = useState("");
  const [tags, setTags] = useState("");

  const handleAdd = async (event) => {
    event.preventDefault();
    const textoTrim = texto.trim();
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (textoTrim) {
      const newTodo = await fetch("http://localhost:3000/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          texto: textoTrim,
          feito: false,
          tags: tagsArray,
        }),
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Erro ao adicionar a tarefa");
        }
        return response.json();
      });

      addTodo(newTodo);
      setTexto("");
      setTags("");
    }
  };

  return (
    <form onSubmit={handleAdd} style={{ margin: "16px 0" }}>
      <input
        type="text"
        placeholder="Adicione aqui sua nova tarefa"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <input
        type="text"
        placeholder="Tags (separadas por vírgula)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <button type="submit">Adicionar</button>
    </form>
  );
};

const TodoFilter = ({ setFilter, setTagFilter }) => {
  const [tag, setTag] = useState("");

  const handleFilterClick = (event) => {
    event.preventDefault();
    const filter = event.target.id.replace("filter-", "");
    setFilter(filter);
    setTagFilter(""); // Limpa filtro de tag ao trocar filtro padrão
  };

  const handleTagFilter = (e) => {
    e.preventDefault();
    if (tag.trim()) {
      setFilter("tag");
      setTagFilter(tag.trim());
    }
  };

  return (
    <div className="center-content" style={{ marginBottom: 16 }}>
      <a href="#" id="filter-all" onClick={handleFilterClick}>
        Todos os itens
      </a>
      <a href="#" id="filter-done" onClick={handleFilterClick} style={{ marginLeft: 8 }}>
        Concluídos
      </a>
      <a href="#" id="filter-pending" onClick={handleFilterClick} style={{ marginLeft: 8 }}>
        Pendentes
      </a>
      <form onSubmit={handleTagFilter} style={{ display: "inline", marginLeft: 16 }}>
        <input
          type="text"
          placeholder="Filtrar por tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          style={{ marginRight: 4 }}
        />
        <button type="submit">Filtrar</button>
      </form>
    </div>
  );
};

const TodoItem = ({ todo, markTodoAsDone }) => {
  const handleClick = () => {
    markTodoAsDone(todo.id);
  };

  return (
    <>
      {todo.feito ? (
        <li style={{ textDecoration: "line-through" }}>
          {todo.texto}
          {todo.tags && todo.tags.length > 0 && (
            <span style={{ marginLeft: 8, color: "#888", fontSize: "0.9em" }}>
              [tags: {todo.tags.join(", ")}]
            </span>
          )}
        </li>
      ) : (
        <li>
          {todo.texto}
          {todo.tags && todo.tags.length > 0 && (
            <span style={{ marginLeft: 8, color: "#888", fontSize: "0.9em" }}>
              [tags: {todo.tags.join(", ")}]
            </span>
          )}
          <button onClick={handleClick} style={{ marginLeft: 8 }}>Concluir</button>
        </li>
      )}
    </>
  );
};

const TodoList = () => {
  const { token, login } = useAuth();
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  const filterBy = (todo) => {
    if (filter === "all") return true;
    if (filter === "done") return todo.feito;
    if (filter === "pending") return !todo.feito;
    return true;
  };

  const applyFilter = (newFilter) => {
    setFilter(newFilter);
  };

  useEffect(() => {
    const fetchTodos = async () => {
      if (!token) return;

      try {
        let url = "http://localhost:3000/todos";
        if (filter === "tag" && tagFilter) {
          url = `http://localhost:3000/todos/por-tag?tag=${encodeURIComponent(tagFilter)}`;
        }
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error("Erro ao buscar os dados");
        
        const data = await response.json();
        setTodos(data);
      } catch (error) {
        console.error("Erro ao buscar os dados:", error);
      }
    };

    fetchTodos();
  }, [token, filter, tagFilter]);

  const addTodo = (newTodo) => {
    setTodos((prevTodos) => [...prevTodos, newTodo]);
    if (filter === "done") applyFilter("all");
  };

  const markTodoAsDone = async (id) => {
    const updatedTodo = await fetch(`http://localhost:3000/todos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        feito: true,
      }),
    }).then((response) => {
      if (!response.ok) 
        throw new Error("Erro ao marcar a tarefa como concluída");

      return response.json();
    });

    setTodos((prevTodos) =>
      prevTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
    );
  };
  if (!token) return <LoginForm onLogin={login} />;

  return (
    <>
      <h1>Todo List</h1>
      <div className="center-content">
        Versão Final da aplicação de lista de tarefas para a disciplina
        SPODWE2
      </div>
      <TodoFilter setFilter={applyFilter} setTagFilter={setTagFilter} />
      <AddTodo addTodo={addTodo} token={token}/>

      {todos ? 
        (<ul id="todo-list">
          {todos.filter(filterBy).map((todo, index) => (
            <TodoItem key={index} todo={todo} markTodoAsDone={markTodoAsDone} />
          ))}
        </ul>
        ) :
        (<div className="center-content">Carregando...</div>)
      }
    </>
  );
};

export { TodoList };
