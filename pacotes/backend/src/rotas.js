import { registraUsuario, loginUsuario, getAllUsuarios } from "./Controllers/Usuarios.js";
import { allTodos, criaTodo, atualizaTodo, filtrarPorTag } from "./Controllers/Todos.js";
import { auth } from "./middlewares/auth.mjs";
import { Router } from "express";

const rotas = Router();

rotas.get("/", (req, res) => {
    res.send("Hello, World!");
});

rotas.post("/usuarios", registraUsuario);
rotas.post("/login", loginUsuario);

rotas.get("/todos", auth, allTodos);
rotas.post("/todos", auth, criaTodo);
rotas.put("/todos/:id", auth, atualizaTodo);

export default rotas;