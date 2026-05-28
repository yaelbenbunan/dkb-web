# Fotos de platos — sector restauración

Cuatro subcarpetas por tipo de cocina + una opción "Otra" que el código
mezcla automáticamente cuando el usuario la elige.

```
restauracion/platos/
├── mexicana/      ← tacos, enchiladas, guacamole, nachos, etc.
├── italiana/      ← pasta, pizza, risotto, antipasti, etc.
├── japonesa/      ← sushi, ramen, gyozas, tempura, etc.
└── tradicional/   ← cocina española/europea (paella, tapas, carnes, pescados, postres)
```

## Naming convention

Sube las fotos numeradas: `foto-1.jpg`, `foto-2.jpg`, … (4-5 por carpeta).

## Recomendaciones

- **Formato**: JPG (o WebP). Peso < 300 KB por foto.
- **Resolución**: 800×800 ideal (cuadrada) o 1200×800 (4:3 horizontal).
- **Plano**: cenital o frontal, plato bien iluminado y enmarcado.
- **Sin texto, logos ni marcas de agua** en la foto.
- **Sin platos a medio comer ni rostros visibles** (las fotos van en grid de
  galería, no en tarjetas individuales con persona).

## ¿Qué pasa con "Otra"?

Si el usuario elige "Otra" en el wizard, el template no lee de una carpeta
específica. Mezcla aleatoriamente 1-2 platos de cada una de las 4 carpetas
para que se vea variado.

## Cómo se consumen

El componente `InformativaSectorTemplate` (próximamente con un branch para
restauración) leerá `platos/{tipo elegido}/foto-*.jpg`, mezclará aleatoriamente
y mostrará 6-8 platos en un grid con nombres y descripciones generados por
IA.

Si una carpeta está vacía cuando el usuario elige esa cocina, el template
cae al fallback (mezcla de las 4 carpetas, igual que "Otra").
