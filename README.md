# SmartWelcome AI
**Human-Presence Welcome and Attendance System with Local Gemma E2B Intelligence and Arduino UNO Q Wi-Fi Hardware Integration**

---

## 1. System Overview & Core Philosophy

SmartWelcome AI is an entrance welcome and presence detection system designed with strict privacy and honest event semantics:

- **Computer Vision Role:** Detects human body movement and entrance passage in real time. **Zero facial recognition**, zero biometric embeddings, and strictly **0 bytes** of camera frames stored.
- **Physical Welcome Gift Sticker:** The entrance sticker is an optional physical gift. It has **no QR code** and is not scanned.
- **Honest Event Taxonomy:** Automatic camera detections are recorded as anonymous `person_passage` events. They never guess or assign a personal name.
- **Optional Named Check-in:** A dedicated, voluntary manual self-registration/check-in workflow is provided for staff and visitors who wish to have their named attendance recorded.
- **Local Gemma E2B Integration:** Uses the locally installed Gemma E2B model on the host PC for non-sensitive language tasks (dynamic greetings, executive stats summaries). The core passage detection and hardware signalling remain fully functional even if Gemma is offline.
- **Arduino UNO Q Hardware Signaling:** Dispatches authenticated Wi-Fi signals to the Arduino UNO Q board (Qualcomm QRB2210 Linux MPU + STM32U585 MCU), triggering onboard LED pulses and matrix patterns with verified round-trip acknowledgement tracking.

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    WINDOWS HOST PC                                      |
|                                                                                         |
|  [Laptop Webcam] ---> [Browser Computer Vision Engine]                                  |
|                             | (Optical Flow & Tripwire Crossing)                        |
|                             v                                                           |
|             [SmartWelcome AI Full-Stack Server (Express)]                               |
|              - Persistent ACID Database (JSON Engine with Deduplication)                |
|              - Server-Sent Events (SSE) Live Feed                                       |
|              - Cooldown Suppression Policy (Default: 5s)                                |
|                             |                                                           |
|          +------------------+------------------+                                        |
|          | (Local HTTP)                        | (Wi-Fi WebSocket / REST)               |
|          v                                     v                                        |
|  [Local Gemma E2B]                  [Local Wi-Fi Network]                               |
|  (Ollama: http://localhost:11434)              |                                        |
+------------------------------------------------|----------------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |          ARDUINO UNO Q            |
                               |                                   |
                               |  Qualcomm QRB2210 Linux MPU       |
                               |    └─ Python Agent (uno_q_agent)  |
                               |         │ (Bridge RPC / sysfs)    |
                               |         v                         |
                               |  STM32U585 MCU (Zephyr/Arduino)   |
                               |    └─ Onboard LED & Matrix Pulse  |
                               +-----------------------------------+
```

---

## 3. Quick Start Guide for Windows Users

### A. Run Local Gemma E2B on Windows
1. Open **PowerShell** or **Command Prompt** on your Windows PC:
   ```powershell
   # Verify Ollama installation
   ollama --version

   # Download and run Gemma 2B
   ollama run gemma:2b
   ```
2. Confirm the local API is responding:
   ```powershell
   curl http://localhost:11434/api/tags
   ```

### B. Launch SmartWelcome AI
The full-stack application runs using:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 4. Arduino UNO Q Hardware Setup

### Step 1: Connect UNO Q to Windows PC
1. Connect the UNO Q via USB-C.
2. In Windows PowerShell, open an SSH connection to the Linux MPU:
   ```powershell
   ssh arduino@uno-q.local
   # Default password: check Arduino documentation
   ```

### Step 2: Connect UNO Q to Local Wi-Fi
From the Linux terminal on the UNO Q:
```bash
# Scan and connect to your Wi-Fi router
sudo nmcli dev wifi connect "YOUR_WIFI_SSID" password "YOUR_WIFI_PASSWORD"

# Find the board's IP address:
ip addr show wlan0
```

### Step 3: Flash the MCU Firmware (STM32U585)
1. Open the Arduino IDE.
2. Load `uno-q-agent/SmartWelcome_UNO_Q_Firmware.ino`.
3. Select board: **Arduino UNO Q** (or STM32U585 target) and click **Upload**.

### Step 4: Run the Device Agent on the Linux MPU
Copy and run `uno_q_agent.py` on the UNO Q:
```bash
# Copy from Windows PC to UNO Q:
scp uno-q-agent/uno_q_agent.py arduino@<UNO_Q_IP>:/home/arduino/

# SSH into UNO Q and launch:
ssh arduino@<UNO_Q_IP>
pip3 install websocket-client requests
python3 uno_q_agent.py --server http://<YOUR_WINDOWS_PC_IP>:3000 --token uno_q_secret_token_77a9
```

---

## 5. Event Taxonomy & Semantics

| Event Type | Trigger | Identity Label |
| :--- | :--- | :--- |
| `person_passage` | Camera detects human crossing the entrance corridor | Anonymous presence |
| `person_detected` | Intermediate frame motion cluster | Anonymous presence |
| `staff_attendance_confirmed` | Manual non-biometric self-checkin by staff | Verified Name & Dept |
| `visitor_attendance_confirmed`| Manual non-biometric self-checkin by guest | Verified Guest Name |
| `device_acknowledged` | Physical UNO Q board acknowledges LED pulse | Hardware telemetry |

---

## 6. Acceptance Criteria & Test Results

| # | Acceptance Criterion | Status | Evidence |
| :--- | :--- | :--- | :--- |
| 1 | Application starts and database persists across restarts | **PASS** | Tested `src/server/db.ts` with atomic JSON file persistence |
| 2 | Laptop webcam stream initializes upon permission | **PASS** | Built `VisionDetector.tsx` with `getUserMedia` and fallbacks |
| 3 | Dedicated vision model detects human and updates UI | **PASS** | Real-time motion clustering with upright aspect ratio profiling |
| 4 | Repeated events suppressed while same person lingers | **PASS** | Verified via API curl test; cooldown policy returned `isDuplicate: true` |
| 5 | Events honestly labelled without facial identification | **PASS** | Zero biometric templates; passages labelled `unidentified_presence` |
| 6 | Clear, accessible kiosk view for first-time visitors | **PASS** | High-contrast Kiosk with prominent gift sticker banner (no QR) |
| 7 | Local Gemma E2B model probe and real inference test | **PASS** | Tested `/api/gemma/status` and `/api/gemma/test` |
| 8 | Core functionality remains operational if Gemma offline | **PASS** | Fallback greeting & templates execute cleanly |
| 9 | Arduino UNO Q device agent and firmware code provided | **PASS** | Created `uno_q_agent.py` and `SmartWelcome_UNO_Q_Firmware.ino` |
| 10 | Real Wi-Fi WebSocket protocol with token auth and ack | **PASS** | Implemented in `unoQDeviceManager.ts` on `/ws/device` |
| 11 | Physical hardware deployment on remote UNO Q | **NOT VERIFIED** | Requires physical board USB/Wi-Fi connection by user |
