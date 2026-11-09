// Initialize RFID module
RFID_RC522.Init();

// Get ID of RFID card
serial.writeLine(RFID_RC522.getID().toString());

// Read data from RFID card
serial.writeLine(RFID_RC522.read());

// Write data to card
RFID_RC522.write("1234")

// Turn off antenna
RFID_RC522.AntennaOff()