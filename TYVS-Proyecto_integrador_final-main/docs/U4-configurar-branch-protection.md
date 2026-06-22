# U4 — Configurar la restricción de integración (pruebas antes de merge)

El pipeline `.github/workflows/ci.yml` ejecuta las pruebas en cada Pull Request.
Para que GitHub **impida el merge cuando las pruebas fallan**, hay que marcar el
check del pipeline como obligatorio en la protección de rama. Esto satisface el
requisito *"el pipeline debe ejecutar pruebas automáticamente antes de permitir
merges o integraciones"*.

## Pasos (interfaz de GitHub)

1. Asegúrate de que el workflow ya corrió al menos una vez (haz un push o abre un
   PR) para que el check **`quality`** aparezca en la lista de status checks.
2. En el repositorio: **Settings → Branches** (o **Settings → Rules → Rulesets**
   en la interfaz nueva).
3. **Add branch ruleset** / **Add classic branch protection rule**.
   - Branch name pattern: `main` (y `master` si aplica).
4. Activa **Require a pull request before merging**
   (opcional: exigir 1 aprobación de revisión).
5. Activa **Require status checks to pass before merging** y, en el buscador,
   selecciona el check **`quality`** (es el job del pipeline que corre pruebas +
   cobertura). Opcionalmente marca también **Require branches to be up to date
   before merging**.
6. (Recomendado) Activa **Do not allow bypassing the above settings** para que la
   regla aplique también a administradores.
7. **Create** / **Save changes**.

## Resultado

A partir de ese momento:

- Cada PR ejecuta automáticamente `npm test`, `npm run integration` y
  `npm run coverage` (gate del 100 %).
- Si **cualquier** prueba falla **o** la cobertura baja del 100 %, el check
  `quality` queda en rojo y el botón **Merge** se **bloquea**.
- Solo cuando el check `quality` está en verde se permite integrar el código.

## Verificación rápida

1. Crea una rama, rompe a propósito una prueba (por ejemplo, cambia un valor
   esperado en `test/tariffCalculator.test.js`) y abre un PR.
2. Observa que el check `quality` falla y el merge queda bloqueado.
3. Revierte el cambio: el check pasa a verde y el merge se habilita.

> Nota: la protección de rama es una configuración del repositorio en GitHub (no
> un archivo versionable). Por eso se documenta aquí, junto con la captura del
> pipeline como evidencia.
