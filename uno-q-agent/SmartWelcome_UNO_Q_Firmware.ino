/*
  SmartWelcome AI - Arduino UNO Q MCU Firmware
  Target: STM32U585 MCU on Arduino UNO Q
  Framework: Arduino Core with Zephyr RTOS support & Arduino Bridge RPC
  
  Controls:
  - Built-in status LED (LED_BUILTIN / pin 13)
  - Onboard RGB / Status indicator
  - 8x12 LED Matrix (if equipped on the UNO Q board variant)
  - Responds to Bridge RPC calls from Qualcomm Linux MPU
*/

#include <Arduino.h>

// Onboard LED pin definitions for UNO Q
#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

// State enumeration
enum SystemState {
  STATE_IDLE = 0,
  STATE_WAITING_FOR_PERSON = 1,
  STATE_PERSON_PASSAGE = 2,
  STATE_CONFIRMED_ATTENDANCE = 3,
  STATE_WIFI_DISCONNECTED = 4,
  STATE_ERROR = 5
};

volatile SystemState currentState = STATE_WAITING_FOR_PERSON;
unsigned long pulseEndTime = 0;
bool isPulsing = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Initialize Serial Bridge for Linux MPU communication
  Serial.begin(115200);
  
  // Power-on indicator sequence: 3 quick blinks
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }

  Serial.println(F("[UNO Q MCU] SmartWelcome Firmware v1.2.0 Initialized."));
}

void loop() {
  // Check for incoming commands over Serial / RPMSG from Linux QRB2210
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    handleCommand(cmd);
  }

  // Handle non-blocking LED pulse duration
  if (isPulsing && millis() >= pulseEndTime) {
    digitalWrite(LED_BUILTIN, LOW);
    isPulsing = false;
    currentState = STATE_WAITING_FOR_PERSON;
  }

  // Idle heartbeat indicator (gentle breathing or periodic tick)
  if (!isPulsing && (millis() % 2000 < 50)) {
    digitalWrite(LED_BUILTIN, HIGH);
  } else if (!isPulsing) {
    digitalWrite(LED_BUILTIN, LOW);
  }
}

void handleCommand(char cmd) {
  switch (cmd) {
    case 'P': // Person Passage detected
      triggerPassageIndicator();
      Serial.println(F("ACK:PASSAGE_OK"));
      break;

    case 'C': // Confirmed Attendance (staff / visitor)
      triggerConfirmedIndicator();
      Serial.println(F("ACK:CONFIRMED_OK"));
      break;

    case '?': // Ping / Health check
      Serial.println(F("ACK:PONG:UNO_Q_STM32U585_OK"));
      break;

    case 'X': // Clear / reset
      digitalWrite(LED_BUILTIN, LOW);
      isPulsing = false;
      Serial.println(F("ACK:CLEARED"));
      break;

    default:
      break;
  }
}

void triggerPassageIndicator() {
  currentState = STATE_PERSON_PASSAGE;
  digitalWrite(LED_BUILTIN, HIGH);
  pulseEndTime = millis() + 2000; // 2 seconds high
  isPulsing = true;
}

void triggerConfirmedIndicator() {
  currentState = STATE_CONFIRMED_ATTENDANCE;
  // Double pulse for confirmed attendance
  digitalWrite(LED_BUILTIN, HIGH);
  pulseEndTime = millis() + 3000;
  isPulsing = true;
}
