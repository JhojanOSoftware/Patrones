// src/features/aspirante/aspirante.js
import { initDB, query, exec, persistDB } from "../../db/db.js";

const form = document.getElementById("formAspirante");
const msg = document.getElementById("msg");
const btnVolver = document.getElementById("btnVolver");

if (btnVolver) {
    btnVolver.addEventListener("click", () => {
        window.location.href = "../../../../index.htm";
    });
}

if (form) {
    form.addEventListener("submit", onSubmit);
}

// ==========================
// UTILIDADES
// ==========================

// Guarda un File en OPFS: /docs/usuarios/{id}/{timestamp-nombre}
async function saveFileToOPFS(userId, file) {
    if (!file) return null;
    const root = await navigator.storage.getDirectory();
    const docsDir = await root.getDirectoryHandle("docs", { create: true });
    const usersDir = await docsDir.getDirectoryHandle("usuarios", { create: true });
    const userDir = await usersDir.getDirectoryHandle(String(userId), { create: true });

    const safeName = `${Date.now()}-${file.name}`;
    const fh = await userDir.getFileHandle(safeName, { create: true });
    const ws = await fh.createWritable();
    await ws.write(await file.arrayBuffer());
    await ws.close();

    return `opfs:/docs/usuarios/${userId}/${safeName}`;
}

// Hash simple SHA-256 (MVP)
async function hashPasswordSHA256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// "JS,  , SQL,,  React " -> ["JS","SQL","React"]
function parseHabilidades(str) {
    return (str ?? "")
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

// Crea si no existe y obtiene id (búsqueda insensible a mayúsculas)
function getOrCreateHabilidadId(nombre) {
    const norm = nombre.trim();

    // 1) Buscar primero
    let rows = query(
        "SELECT id FROM habilidades WHERE LOWER(nombre)=LOWER(?)", [norm]
    );
    if (rows.length) return rows[0].id;

    // 2) Crear si no existe
    exec("INSERT OR IGNORE INTO habilidades(nombre) VALUES (?)", [norm]);

    // 3) Volver a buscar
    rows = query(
        "SELECT id FROM habilidades WHERE LOWER(nombre)=LOWER(?)", [norm]
    );
    if (rows.length) return rows[0].id;

    // 4) Si no aparece, lanzar error controlado
    throw new Error("No se pudo crear/recuperar la habilidad: " + norm);
}

// Migración suave si tu BD existía sin estas columnas
async function migrateUsuariosAddColsIfMissing() {
    const cols = query("PRAGMA table_info(usuarios)");
    const names = new Set(cols.map(c => c.name));
    if (!names.has("genero")) {
        exec("ALTER TABLE usuarios ADD COLUMN genero TEXT CHECK (genero IN ('M','F','NB','OTRO'))");
    }
    if (!names.has("discapacidad")) {
        exec("ALTER TABLE usuarios ADD COLUMN discapacidad TEXT CHECK (discapacidad IN ('NINGUNA','FISICA','SENSORIAL','COGNITIVA','OTRA')) DEFAULT 'NINGUNA'");
    }
}

// Índices únicos normalizados (no fallan si ya existen)
function ensureNormalizedUniqueIndexes() {
    exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email_nocase ON usuarios (LOWER(email));");
    exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_habilidades_nombre_nocase ON habilidades (LOWER(nombre));");
}

// ==========================
// EVENTO: GUARDAR PERFIL
// ==========================
async function onSubmit(e) {
    e.preventDefault();
    msg.textContent = "";
    msg.style.color = "";

    const raw = Object.fromEntries(new FormData(form).entries());
    const email = (raw.email ?? "").trim().toLowerCase();
    const data = { ...raw, email };

    const errores = [];
    if (!data.nombre || !data.nombre.trim()) errores.push("El nombre es obligatorio.");
    if (!email) errores.push("El email es obligatorio.");
    if (!data.password || data.password.length < 8)
        errores.push("La contraseña debe tener al menos 8 caracteres.");
    if (errores.length) {
        msg.textContent = "⚠ " + errores.join(" ");
        msg.style.color = "crimson";
        return;
    }

    try {
        await initDB();
        await migrateUsuariosAddColsIfMissing();
        ensureNormalizedUniqueIndexes();

        // Duplicado por email (insensible a mayúsculas)
        const dup = query("SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?)", [email]);
        if (dup.length) {
            msg.innerHTML = "⚠ Este correo ya está registrado. <strong>Inicia sesión</strong> para continuar.";
            msg.style.color = "crimson";
            return;
        }

        // Hash de contraseña
        const password_hash = await hashPasswordSHA256(data.password);

        // Insertar usuario
        exec(
            `INSERT INTO usuarios (email, password_hash, nombre, rol, genero, discapacidad)
             VALUES (?, ?, ?, 'ASPIRANTE', ?, ?)`, [
                email,
                password_hash,
                data.nombre.trim(),
                data.genero || null,
                data.discapacidad || "NINGUNA"
            ]
        );
        const { id: usuarioId } = query("SELECT last_insert_rowid() AS id")[0];

        // Habilidades (acepta repeticiones en input; BD las ignora)
        const habs = parseHabilidades(data.habilidades);
        for (const h of habs) {
            try {
                const habId = getOrCreateHabilidadId(h);
                exec(
                    "INSERT OR IGNORE INTO usuario_habilidad (usuario_id, habilidad_id, nivel) VALUES (?, ?, ?)", [usuarioId, habId, null]
                );
            } catch (errHab) {
                console.warn("Habilidad omitida:", h, errHab);
            }
        }

        // Guardar CV si se adjuntó
        const cvFile = form.cv?.files?.[0] || null;
        if (cvFile) {
            const url_local = await saveFileToOPFS(usuarioId, cvFile);
            exec(
                `INSERT INTO documentos (owner_type, owner_id, categoria, nombre, mime_type, url_local)
                 VALUES ('USUARIO', ?, 'CV', ?, ?, ?)`, [usuarioId, cvFile.name, cvFile.type || "application/octet-stream", url_local]
            );
        }

        await persistDB();

        msg.textContent = "✔ Perfil guardado correctamente.";
        msg.style.color = "green";
        form.reset();
        console.log("Usuario creado id:", usuarioId);
    } catch (err) {
        console.error(err);
        msg.textContent = "❌ Error al guardar el perfil. Revisa la consola.";
        msg.style.color = "crimson";
    }
}

console.log("Perfil aspirante cargado");