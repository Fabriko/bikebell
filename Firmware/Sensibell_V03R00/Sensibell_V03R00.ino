/*Version 0.3 revision 00 (V03R00)
Desigened to work with board version Bell003 production run 001 2015/09/03
Pinouts are:
Red Switch - A2
Red LED - A5
Green Switch - 11
Green LED - 9
Diagnostic LED - 13

Developed in 2015 with:
Fab Lab Wgtn supported by Craig Hobern, Wendy Neale, Mike Jones & Zoilo Abad
Fablab CHCH supported by Hugh Barnes & Carl Pavletich 

This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
*/
// Include Library
#include <SPI.h>
#include <boards.h>
#include <RBL_nRF8001.h>
#include <RBL_services.h>
#include <EEPROM.h>

//pin setup
static int INPUT_GOOD = 11;
static int INPUT_POOR = A2;
static int LED_GREEN = 9;
static int LED_RED = A5;
static int LED_DEBUG = 13;

//static program setting
static int outputBufferSize = 4;
static int inputBufferSize = 4;
static char deviceId[ ] = "SensiB-01";

//globals
short lastGoodState;
short lastPoorState;

//inital setup function
void setup() {
  digitalWrite(LED_RED, HIGH);
  digitalWrite(LED_DEBUG, HIGH);
  //setup pinmodes and serial connection
  Serial.begin(9600);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(INPUT_GOOD, INPUT);
  pinMode(INPUT_POOR, INPUT);

  // Set pins used for REQN and RDYN (must be before ble_begin)
  ble_set_pins(6, 7);

  // Initialize BLE library.
  ble_begin();

  // Set a custom BLE name.
  ble_set_name(deviceId);
  //debugging light pattent on powerup
  digitalWrite(LED_DEBUG, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, HIGH);
  delay(1000);
  digitalWrite(LED_GREEN, LOW);
}


void loop() {
  // Hacky input read
  while(ble_available()) {
    //D 0x44    R 0x52    G 0x47    : 0x3a    1 0x31    null 0x00   
   //R:01 turns red led on, R:00 turns it off. use G for green and D for debug.
    byte inputBuffer[inputBufferSize];
    inputBuffer[0] = ble_read();
    inputBuffer[1] = ble_read();
    inputBuffer[2] = ble_read();
    inputBuffer[3] = ble_read();
    
    if(inputBuffer[0] == 0x47 && inputBuffer[3] == 0x30) {
      digitalWrite(LED_GREEN, LOW);
    } 
    if(inputBuffer[0] == 0x47 && inputBuffer[3] == 0x31) {
      digitalWrite(LED_GREEN, HIGH);
    }
    if(inputBuffer[0] == 0x52 && inputBuffer[3] == 0x30) {
      digitalWrite(LED_RED, LOW);
    } 
    if(inputBuffer[0] == 0x52 && inputBuffer[3] == 0x31) {
      digitalWrite(LED_RED, HIGH);
    }
    if(inputBuffer[0] == 0x44 && inputBuffer[3] == 0x30) {
      digitalWrite(LED_DEBUG, LOW);
    } 
    if(inputBuffer[0] == 0x44 && inputBuffer[3] == 0x31) {
      digitalWrite(LED_DEBUG, HIGH);
    }
  }
  

  // Read input pins and send changes over BLE
  boolean g = digitalRead(INPUT_GOOD);
  boolean p = digitalRead(INPUT_POOR);
  unsigned char outputBuffer[outputBufferSize];
  //check for low state and state change so buttons trigger on release
  if(g == LOW && g != lastGoodState){
    stockBuffer(outputBuffer, 'B', ':', '0', '1');
    ble_write_bytes((byte*)&outputBuffer, 4);
  }
    if(p == LOW && p != lastPoorState){
      stockBuffer(outputBuffer, 'B', ':', '0', '2');
      ble_write_bytes((byte*)&outputBuffer, 4);
  }

  lastGoodState = g;
  lastPoorState = p;

  // Process outstanding BLE events
  ble_do_events();
}

void stockBuffer(unsigned char *outputBuffer, char v0, char v1, char v2, char v3){
  outputBuffer[0] = v0;
  outputBuffer[1] = v1;
  outputBuffer[2] = v2;
  outputBuffer[3] = v3;
}

