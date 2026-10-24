# Arduino UNO Q Setup Guide for SmartWelcome AI

This guide walks you through setting up your **Arduino UNO Q** development board to receive live Wi-Fi signals whenever a person is detected at your entrance.

---

## Hardware Architecture Overview
The Arduino UNO Q features a dual-core heterogeneous architecture:
1. **Qualcomm QRB2210 Linux MPU**: Runs Debian Linux, connects to your local Wi-Fi, and hosts the Python device agent.
2. **STM32U585 MCU**: Real-time microcontroller that drives the onboard LEDs and hardware pins via the Arduino Bridge interface.

---

## Step 1: Connect Arduino UNO Q to your Windows PC
1. Connect the UNO Q to your Windows PC using a USB-C data cable.
2. Open Windows Device Manager and check under **Ports (COM & LPT)** to find the serial port (e.g. `COM4`).
3. Open a terminal (PuTTY or PowerShell) to connect to the Linux serial console:
   ```cmd
   ssh arduino@uno-q.local
   # Or connect via serial at 115200 baud
   ```
   *(Default username is `arduino` or `root`)*

---

## Step 2: Connect UNO Q to your Wi-Fi Network
From the Linux terminal on the UNO Q:
```bash
# Scan available Wi-Fi networks
nmcli dev wifi list

# Connect to your Wi-Fi network
sudo nmcli dev wifi connect "YOUR_WIFI_SSID" password "YOUR_WIFI_PASSWORD"

# Verify IP address assigned to the UNO Q
ip addr show wlan0
```
Note the assigned IP address (e.g. `192.168.1.145`).

---

## Step 3: Upload the MCU Firmware (STM32U585)
1. Open the Arduino IDE on your Windows PC.
2. Select Board: **Arduino UNO Q** (or Zephyr STM32U585 target).
3. Open `SmartWelcome_UNO_Q_Firmware.ino`.
4. Click **Upload**.
5. The onboard LED will blink 3 times on boot to signal ready state.

---

## Step 4: Run the Device Agent on the Linux MPU
Copy `uno_q_agent.py` to your UNO Q board:
```bash
# On your Windows PC (PowerShell):
scp uno-q-agent/uno_q_agent.py arduino@192.168.1.145:/home/arduino/

# SSH into the UNO Q:
ssh arduino@192.168.1.145

# Install websocket-client (one-time):
sudo apt-get update && sudo apt-get install -y python3-pip
pip3 install websocket-client requests

# Run the agent (replace with your computer's local IP):
python3 /home/arduino/uno_q_agent.py --server http://192.168.1.50:3000 --token uno_q_secret_token_77a9
```

---

## Step 5: Verify Hardware Response
1. Walk across the camera view in the SmartWelcome AI kiosk.
2. The browser registers a `person_passage` event.
3. The server dispatches the command to the UNO Q over Wi-Fi.
4. The UNO Q agent receives the command, pulses the physical onboard LED, and sends back an authenticated `ACK`.
5. The SmartWelcome dashboard displays the verified round-trip latency (typically 25-45ms).
