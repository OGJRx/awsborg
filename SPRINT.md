# SPRINT 1.4: EJECUCIÓN REMOTA SEGURA

## ESTADO ACTUAL
- **Ciclo:** Turno 1/5 (Post-limpieza)
- **Canal:** PENDIENTE (SSH o SSM requerido)
- **Script:** `/download/ec2_mutation_script.sh` listo

---

## FASE I: ESTABLECER CANAL SEGURO

| Paso | Comando | Estado |
|------|---------|--------|
| ① | `ssh ubuntu@18.222.255.81` | ⏳ Pendiente |
| ② | O usar AWS SSM Session Manager | ⏳ Alternativa |

---

## FASE II: EJECUTAR SCRIPT EN EC2

```bash
# Una vez conectado vía SSH/SSM
cd /opt/augeborg  # Ajustar según ubicación real
bash /tmp/ec2_mutation_script.sh
```

**El script ejecuta:**
- ✅ Pre-verificaciones (jq, node, npm, wrangler)
- ✅ Inyección de tipos en tsconfig
- ✅ Actualización de compatibility_date
- ✅ Instalación de dependencias
- ✅ Linting estricto
- ✅ Compilación Backend + Frontend
- ✅ Documentación Feynman
- ✅ Commit preparado

---

## FASE III: DESPLIEGUE POST-COMPILACIÓN

| Paso | Comando | Estado |
|------|---------|--------|
| ① | `git push origin super-borg-v0.1` | ⏳ Pendiente |
| ② | `npx wrangler deploy -c augeborg-backend/wrangler.toml` | ⏳ Pendiente |
| ③ | `npx wrangler deploy -c augeborg-frontend/wrangler.toml` | ⏳ Pendiente |
| ④ | Verificar webhook Telegram | ⏳ Pendiente |
| ⑤ | Test `/start` en bot | ⏳ Pendiente |

---

## ARQUITECTURA DE EJECUCIÓN AUTORIZADA

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OPERADOR    │────▶│  SSH/SSM     │────▶│  AWS EC2     │
│  (Humano)    │     │  (Cifrado)   │     │  (Ejecución) │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     🚫 PROHIBIDO:
                     - Webhook RCE
                     - HTTP sin cifrar
                     - Token estático expuesto
```

---

## MÉTRICAS DE ÉXITO

| Métrica | Criterio |
|---------|----------|
| Compilación Backend | 0 errores TypeScript |
| Compilación Frontend | 0 errores TypeScript |
| Linting | 0 warnings |
| Deploy Backend | HTTP 200 en health check |
| Deploy Frontend | Webhook Telegram respondiendo |
| Bot Test | `/start` devuelve dashboard |

---

## BLOQUEOS CONOCIDOS

1. **Sin acceso SSH/SSM** → No se puede ejecutar
2. **EC2 no tiene proyecto clonado** → Clonar primero
3. **Secretos no configurados** → Configurar antes de deploy
