# Servidor puente de impresión de etiquetas

Pequeño servidor que recibe peticiones desde `ver_pedidos.html` (vista Preparador)
por HTTP y las reenvía como ZPL a la impresora de red **lp501i066**
(`10.25.65.230:9100`) por socket TCP, ya que un navegador no puede abrir
sockets directamente.

## Requisitos

- [Node.js](https://nodejs.org) instalado en el PC/servidor donde lo vayas a ejecutar.
- Ese PC debe estar en la misma red que la impresora (debe poder alcanzar `10.25.65.230:9100`)
  y ser accesible desde la TC26.

## Puesta en marcha

```bash
cd puente-impresion
npm install
node server.js
```

Verás:

```
Servidor puente escuchando en http://0.0.0.0:9123
Reenviando etiquetas a la impresora 10.25.65.230:9100 (ZPL, 203dpi)
```

Deja esa ventana/terminal abierta. Mientras esté encendida, se pueden imprimir etiquetas.

## Configurar la web

En `ver_pedidos.html`, la primera vez que un usuario Preparador pulse
**"🏷 Imprimir etiqueta"**, se le pedirá la URL de este servidor. Debe escribir:

```
http://IP_DE_ESTE_PC:9123/imprimir-etiqueta
```

Sustituyendo `IP_DE_ESTE_PC` por la IP de este PC/servidor dentro de la red
donde también está la TC26 (no `localhost`, salvo que se abra la web desde
este mismo equipo). Esa URL se guarda en el propio navegador/dispositivo, así
que solo hay que introducirla una vez por dispositivo. Se puede cambiar más
tarde con el botón "⚙" que hay junto al buscador de la vista Preparador.

## Ajustes

Todo se configura al principio de `server.js`:

- `PRINTER_IP` / `PRINTER_PORT`: dirección de la impresora (por defecto `10.25.65.230:9100`).
- `PRINTER_DPI`: 203 por defecto. Si las etiquetas salen con un tamaño incorrecto
  (demasiado grandes o pequeñas), prueba a cambiarlo a 300.
- `SERVER_PORT`: puerto en el que escucha este servidor (por defecto `9123`).

## Ejecutar siempre encendido (opcional)

Si quieres que arranque solo con el PC/servidor y no dependa de dejar una
terminal abierta, puedes usar herramientas como [pm2](https://pm2.keymetrics.io/)
(Windows/Linux) o crear un servicio/tarea programada. Dímelo si quieres que te
prepare esa configuración también.
