import express, { Request, Response } from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

// Inicializar servidor
const app = express();
const PORT = 3000;

// Middlewares
// Configuración de CORS más explícita para permitir el método DELETE
app.use(cors({
    origin: '*', // Permite cualquier origen, ajusta si es necesario por seguridad
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'] // Añadimos DELETE
}));
app.use(express.json());

// Carpeta de uploads
// Apuntamos a la carpeta 'uploads' en la raíz del proyecto, no dentro de 'server'
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Inicializar base de datos
const dbPath = path.join(__dirname, "music.db");
const db = new sqlite3.Database(dbPath);

// Crear tabla si no existe
db.run(`
    CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        file_path TEXT
    )
`);

// 📌 Subir canción
app.post("/upload", upload.single("song"), (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).send("No se recibió ningún archivo");
    }

    const filePath = "/uploads/" + req.file.filename;
    const title = req.file.originalname;

    db.run(
        "INSERT INTO songs (title, file_path) VALUES (?, ?)",
        [title, filePath],
        function (err) {
            if (err) {
                console.error("Error inserting song:", err);
                return res.status(500).send("Error al guardar en la BD");
            }

            res.json({
                id: this.lastID,
                title,
                file_path: filePath,
            });
        }
    );
});

// 📌 Obtener lista de canciones
app.get("/songs", (req: Request, res: Response) => {
    db.all("SELECT * FROM songs", (err, rows) => {
        if (err) {
            console.error("Error fetching songs:", err);
            return res.status(500).send("Error al obtener canciones");
        }
        res.json(rows);
    });
});

// 📌 Eliminar una canción
app.delete("/songs/:id", (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. Buscar la ruta del archivo en la BD antes de borrar el registro
    db.get("SELECT file_path FROM songs WHERE id = ?", [id], (err, row: { file_path: string }) => {
        if (err) {
            console.error("Error finding song in DB:", err);
            return res.status(500).send("Error al buscar la canción en la base de datos.");
        }
        if (!row) {
            return res.status(404).send("Canción no encontrada.");
        }

        // 2. Construir la ruta correcta y eliminar el archivo físico del servidor
        // row.file_path es '/uploads/filename.mp3', necesitamos solo 'filename.mp3'
        const fileName = path.basename(row.file_path);
        const filePath = path.join(uploadsDir, fileName);
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting audio file:", unlinkErr);
                // No detenemos el proceso, aún intentamos borrarlo de la BD
            }

            // 3. Eliminar el registro de la base de datos
            db.run("DELETE FROM songs WHERE id = ?", [id], function (deleteErr) {
                if (deleteErr) {
                    console.error("Error deleting song from DB:", deleteErr);
                    return res.status(500).send("Error al eliminar la canción de la base de datos.");
                }
                console.log(`Song with id ${id} deleted. Rows affected: ${this.changes}`);
                res.status(200).send("Canción eliminada correctamente.");
            });
        });
    });
});

// 📌 Eliminar TODAS las canciones
app.delete("/songs/all", (req: Request, res: Response) => {
    // 1. Eliminar todos los archivos de la carpeta 'uploads'
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            console.error("Error reading uploads directory:", err);
            return res.status(500).send("Error al leer el directorio de canciones.");
        }

        for (const file of files) {
            fs.unlink(path.join(uploadsDir, file), unlinkErr => {
                if (unlinkErr) {
                    // Loguear el error pero no detener el proceso, para intentar limpiar la BD de todas formas
                    console.error(`Error deleting file ${file}:`, unlinkErr);
                }
            });
        }

        // 2. Eliminar todos los registros de la base de datos
        db.run("DELETE FROM songs", function (deleteErr) {
            if (deleteErr) {
                console.error("Error deleting all songs from DB:", deleteErr);
                return res.status(500).send("Error al eliminar las canciones de la base de datos.");
            }
            console.log(`All songs deleted. Rows affected: ${this.changes}`);
            res.status(200).send("Todas las canciones han sido eliminadas.");
        });
    });
});

// 📌 Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "public")));

// 📌 Servir los uploads (para que el <audio> pueda acceder a ellos)
app.use("/uploads", express.static(uploadsDir));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🎵 Servidor corriendo en http://localhost:${PORT}`);
});
