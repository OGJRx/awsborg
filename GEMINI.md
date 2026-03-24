# GEMINI

## PROTOCOLO OPERATIVO
- Operación remota exclusiva: AWS EC2.
- Prohibida toda instalación o modificación en local.
- Comunicación: Vertical, aforística, señal alta.
- Rigor: Cero suposiciones, validación atómica.
- Protocolo: Registro histórico en MEMORY.md.
- Reactive Memory (MCP): Actualizar cada 5 interacciones.

## CANALES AUTORIZADOS
- ✅ SSH (puerto 22)
- ✅ AWS SSM Session Manager
- 🚫 Webhook RCE (PROHIBIDO)
- 🚫 HTTP sin cifrar

---

🧠 **[MÉTODO FEYNMAN] Sistema de César cifrado**
*Timestamp:[2026-03-20]*

📌 **Esencia:** Imagina un anillo con el abecedario. El cifrado César consiste en girar ese anillo un número fijo de posiciones. La distancia del giro es tu secreto. Es simétrico: giras a la derecha para ocultar, giras a la izquierda para revelar.

🔧 **Mecánica:**
1. **Espacio:** Mapeamos A-Z a los números 0-25.
2. **Clave (K):** El salto (ej. K = 3).
3. **Cifrar:** Posición_Nueva = (Posición_Actual + K) mod 26.
4. **Descifrar:** Posición_Original = (Posición_Nueva - K) mod 26.

✅ **Prueba:**
* Input: `BORG` (1, 14, 17, 6). Clave K=2.
* Cifrado: B+2=D, O+2=Q, R+2=T, G+2=I. Resultado: `DQTI`.
* Descifrado: Restar 2 a `DQTI` restaura exactamente la secuencia `BORG`. Validado.
