// Servidor puente de impresión de etiquetas.
//
// Qué hace:
//   1. Expone un endpoint HTTP (POST /imprimir-etiqueta) que la web
//      (ver_pedidos.html, vista Preparador) llama con fetch().
//   2. Genera una etiqueta ZPL de 10 cm x 15 cm con la Tienda y el CC.
//   3. Abre una conexión de socket TCP crudo al puerto 9100 de la impresora
//      Zebra/Monarch (lp501i066) y le envía la etiqueta.
//
// Cómo ejecutarlo:
//   1. Instala Node.js (https://nodejs.org) en este PC/servidor si no lo tienes.
//   2. Abre una terminal en esta carpeta y ejecuta:
//        npm install
//        node server.js
//   3. Deja esta ventana abierta mientras quieras poder imprimir etiquetas.
//   4. En la web, la primera vez que pulses "Imprimir etiqueta" en el perfil
//      Preparador, te pedirá la URL de este servidor. Debe ser:
//        http://IP_DE_ESTE_PC:9123/imprimir-etiqueta
//      (usa la IP de este PC dentro de la red de la TC26, no "localhost",
//      salvo que abras la web desde este mismo PC).
//
// Configuración de la impresora: cambia PRINTER_IP / PRINTER_PORT abajo si
// hace falta. Cambia PRINTER_DPI a 300 si tu Monarch imprime a 300dpi en vez
// de 203dpi (si las etiquetas salen con un tamaño incorrecto, es lo primero
// a revisar).

const http = require('http');
const net = require('net');

const PRINTER_IP = '10.25.65.230';
const PRINTER_PORT = 9100;
const PRINTER_DPI = 203; // cambia a 300 si tu modelo imprime a 300dpi
const SERVER_PORT = 9123;

// 10 cm x 15 cm en puntos, según el DPI de la impresora
const LABEL_WIDTH_DOTS = Math.round((10 / 2.54) * PRINTER_DPI);
const LABEL_HEIGHT_DOTS = Math.round((15 / 2.54) * PRINTER_DPI);

function escaparZpl(texto) {
    return String(texto || '').replace(/[\^~]/g, '');
}

function generarZpl(tienda, cc) {
    const t = escaparZpl(tienda);
    const c = escaparZpl(cc);
    return [
        '^XA',
        `^PW${LABEL_WIDTH_DOTS}`,
        `^LL${LABEL_HEIGHT_DOTS}`,
        '^CI28', // UTF-8, para tildes/ñ
        '^CF0,50',
        '^FO40,140^FDTIENDA^FS',
        '^CF0,110',
        `^FO40,210^FD${t}^FS`,
        '^CF0,50',
        '^FO40,520^FDCC^FS',
        '^CF0,110',
        `^FO40,590^FD${c}^FS`,
        '^XZ'
    ].join('\n');
}

function enviarAImpresora(zpl) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error('Tiempo de espera agotado conectando con la impresora.'));
        }, 8000);

        socket.connect(PRINTER_PORT, PRINTER_IP, () => {
            socket.write(zpl, 'utf8', () => {
                clearTimeout(timeout);
                socket.end();
                resolve();
            });
        });

        socket.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

const server = http.createServer((req, res) => {
    // CORS abierto: esto es una herramienta interna en red local.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Servidor puente de impresión activo.\nImpresora destino: ${PRINTER_IP}:${PRINTER_PORT}\nEnvía POST a /imprimir-etiqueta con { "tienda": "...", "cc": "..." }`);
        return;
    }

    if (req.method === 'POST' && req.url === '/imprimir-etiqueta') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const tienda = data.tienda || '';
                const cc = data.cc || '';
                if (!tienda && !cc) {
                    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('Faltan datos: tienda y/o cc.');
                    return;
                }
                const zpl = generarZpl(tienda, cc);
                await enviarAImpresora(zpl);
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Etiqueta enviada correctamente.');
            } catch (error) {
                console.error('Error al imprimir etiqueta:', error.message);
                res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`No se pudo conectar con la impresora (${PRINTER_IP}:${PRINTER_PORT}): ${error.message}`);
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado.');
});

server.listen(SERVER_PORT, () => {
    console.log(`Servidor puente escuchando en http://0.0.0.0:${SERVER_PORT}`);
    console.log(`Reenviando etiquetas a la impresora ${PRINTER_IP}:${PRINTER_PORT} (ZPL, ${PRINTER_DPI}dpi)`);
    console.log('Deja esta ventana abierta. Pulsa Ctrl+C para detener el servidor.');
});
