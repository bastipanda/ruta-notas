# Dibuja el ícono de la app (una estrella con ondas, sobre el color de la marca) y lo guarda como PNG.
# No usa librerías externas. Se corre a mano si se quiere cambiar el ícono:
#   python herramientas/crear-icono.py
import math, os, struct, zlib

FONDO, FRENTE = (11, 92, 107), (255, 255, 255)

def dibujar(ruta, n, muestras=2):
    N = n * muestras
    # estrella de cinco puntas, un poco abajo y a la izquierda del centro
    R, ox, oy = N * 0.29, N * 0.43, N * 0.58
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rad = R if i % 2 == 0 else R * 0.42
        pts.append((ox + rad * math.cos(a), oy + rad * math.sin(a)))

    def en_estrella(x, y):
        dentro, j = False, len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]; xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                dentro = not dentro
            j = i
        return dentro

    ax, ay = N * 0.58, N * 0.42  # origen de las ondas, hacia arriba a la derecha
    def en_onda(x, y):
        dx, dy = x - ax, ay - y
        if dx <= 0 or dy <= 0:
            return False
        d = math.hypot(dx, dy)
        return abs(d - N * 0.15) < N * 0.027 or abs(d - N * 0.27) < N * 0.027

    filas = bytearray()
    for py in range(n):
        filas.append(0)
        for px in range(n):
            c = 0
            for sy in range(muestras):
                for sx in range(muestras):
                    x, y = px * muestras + sx + 0.5, py * muestras + sy + 0.5
                    if en_estrella(x, y) or en_onda(x, y):
                        c += 1
            t = c / (muestras * muestras)
            filas.extend(int(FONDO[k] + (FRENTE[k] - FONDO[k]) * t) for k in range(3))

    def bloque(tipo, datos):
        return struct.pack('>I', len(datos)) + tipo + datos + struct.pack('>I', zlib.crc32(tipo + datos))
    png = b'\x89PNG\r\n\x1a\n' + bloque(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0)) \
        + bloque(b'IDAT', zlib.compress(bytes(filas), 9)) + bloque(b'IEND', b'')
    with open(ruta, 'wb') as f:
        f.write(png)
    print(ruta, len(png), 'bytes')

raiz = os.path.join(os.path.dirname(__file__), '..', 'iconos')
os.makedirs(raiz, exist_ok=True)
dibujar(os.path.join(raiz, 'icono-180.png'), 180, 3)  # el que usa iPhone
dibujar(os.path.join(raiz, 'icono-192.png'), 192, 3)
dibujar(os.path.join(raiz, 'icono-512.png'), 512, 2)
