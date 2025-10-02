    const express = require("express");
    const sqlite3 = require("sqlite3").verbose();
    const cors = require("cors");
    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");

    const app = express();
    const PORT = 3001;

    app.use(cors());
    app.use(express.json());

    // 📂 Asegurarse de que la carpeta uploads exista
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    // 📂 Configuración de Multer para subir archivos
    const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
    });
    const upload = multer({ storage });

    // 📂 Servir frontend (index.html, player.js, style.css)
    app.use(express.static(path.join(__dirname, "public")));

    // 🎵 Base de datos SQLite
    const db = new sqlite3.Database("songs.db");
    db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, file_path TEXT)"
    );
    });

    // 📌 Subir canción
    app.post("/upload", upload.single("song"), (req, res) => {
    const title = req.file.originalname;
    const file_path = "/uploads/" + req.file.filename;

    db.run("INSERT INTO songs (title, file_path) VALUES (?, ?)", [title, file_path], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
        id: this.lastID,
        title,
        file_path,
        });
    });
    });

    // 📌 Obtener canciones
    app.get("/songs", (req, res) => {
    db.all("SELECT * FROM songs", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
    });

    // 📂 Servir archivos subidos
    app.use("/uploads", express.static(uploadsDir));

    // 🚀 Iniciar servidor
    app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
