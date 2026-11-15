/**
  * RFID_RC522 Block
  */
//% color="#275C6B" weight=100 icon="\uf2bb" block="RFID - RC522"
namespace RFID_RC522 {
    let Type2 = 0
    const BlockAdr: number[] = [8, 9, 10]
    let TPrescalerReg = 0x2B
    let TxControlReg = 0x14
    let PICC_READ = 0x30
    let PICC_ANTICOLL = 0x93
    let PCD_RESETPHASE = 0x0F
    let temp = 0
    let val = 0
    let uid: number[] = []

    let returnLen = 0
    let returnData: number[] = []
    let status = 0
    let u = 0
    let ChkSerNum = 0
    let returnBits: any = null
    let recvData: number[] = []
    let PCD_IDLE = 0
    let d = 0

    let Status2Reg = 0x08
    let CommandReg = 0x01
    let BitFramingReg = 0x0D
    let MAX_LEN = 16
    let PCD_AUTHENT = 0x0E
    let PCD_TRANSCEIVE = 0x0C
    let PICC_REQIDL = 0x26
    let PICC_AUTHENT1A = 0x60

    let ComIrqReg = 0x04
    let DivIrqReg = 0x05
    let FIFODataReg = 0x09
    let FIFOLevelReg = 0x0A
    let ControlReg = 0x0C
    let Key = [255, 255, 255, 255, 255, 255]

    function SetBits(reg: number, mask: number) {
        let tmp = SPI_Read(reg)
        SPI_Write(reg, (tmp | mask))
    }

    function SPI_Write(adr: number, val: number) {
        pins.digitalWritePin(DigitalPin.P16, 0)
        pins.spiWrite((adr << 1) & 0x7E)
        pins.spiWrite(val)
        pins.digitalWritePin(DigitalPin.P16, 1)
    }

    function readFromCard(forventetID: number = 0): string {
        let [status, Type2] = Request(PICC_REQIDL)
        if (status != 0) {
            return null, null
        }

        [status, uid] = AvoidColl()

        if (status != 0) {
            return null, null
        }

        let id = getIDNum(uid)
        if (forventetID != 0 && id != forventetID) {
            serial.writeLine("RFID: en annen brikke svarte ved kontroll")
            return ""
        }
        TagSelect(uid)
        status = Authent(PICC_AUTHENT1A, 11, Key, uid)
        let data: NumberFormat.UInt8LE[] = []
        let text_read = ''
        let block: number[] = []
        if (status == 0) {
            for (let BlockNum of BlockAdr) {
                block = ReadRFID(BlockNum)
                if (block) {
                    data = data.concat(block)
                } else if (forventetID != 0) {
                    Crypto1Stop()
                    serial.writeLine("RFID: lesefeil på blokk " + BlockNum)
                    return ""
                }
            }
            if (data) {
                for (let c of data) {
                    text_read = text_read.concat(String.fromCharCode(c))
                }
            }
        }
        Crypto1Stop()
        return text_read
    }

    function SPI_Read(adr: number) {
        pins.digitalWritePin(DigitalPin.P16, 0)
        pins.spiWrite(((adr << 1) & 0x7E) | 0x80)
        val = pins.spiWrite(0)
        pins.digitalWritePin(DigitalPin.P16, 1)
        return val
    }

    function writeToCard(txt: string, kontroller: boolean = false): number {
        let [kortStatus, kortType] = Request(PICC_REQIDL)
        if (kortStatus != 0) {
            if (kontroller) serial.writeLine("RFID: ingen respons før skriving")
            return 0
        }

        let [idStatus, kortUID] = AvoidColl()
        if (idStatus != 0) {
            if (kontroller) serial.writeLine("RFID: kunne ikke hente kort-ID")
            return 0
        }

        let kortID = getIDNum(kortUID)
        let kortValgt = TagSelect(kortUID)
        if (kontroller && kortValgt == 0) {
            serial.writeLine("RFID: kunne ikke velge brikken")
            return 0
        }

        if (Authent(PICC_AUTHENT1A, 11, Key, kortUID) != 0) {
            Crypto1Stop()
            if (kontroller) serial.writeLine("RFID: tilgang til sektor 2 avvist")
            return kontroller ? 0 : kortID
        }

        let data: number[] = []
        for (let i = 0; i < txt.length; i++) {
            data.push(txt.charCodeAt(i))
        }
        for (let i = txt.length; i < 48; i++) {
            data.push(32)
        }

        for (let i = 0; i < BlockAdr.length; i++) {
            let blokk = BlockAdr[i]
            if (!WriteRFID(blokk, data.slice(i * 16, (i + 1) * 16)) && kontroller) {
                serial.writeLine("RFID: skrivefeil på blokk " + blokk)
                Crypto1Stop()
                return 0
            }
        }

        Crypto1Stop()
        return kortID
    }


    function ReadRFID(blockAdr: number) {
        recvData = []
        recvData.push(PICC_READ)
        recvData.push(blockAdr)
        let pOut2 = []
        pOut2 = CRC_Calculation(recvData)
        recvData.push(pOut2[0])
        recvData.push(pOut2[1])
        let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, recvData)

        if (status != 0) {
            serial.writeLine("Error while reading!")
        }

        if (returnData.length != 16) {
            return null
        }
        else {
            return returnData
        }
    }

    function ClearBits(reg: number, mask: number) {
        let tmp = SPI_Read(reg)
        SPI_Write(reg, tmp & (~mask))
    }



    function Request(reqMode: number): [number, any] {
        let Type: number[] = []
        SPI_Write(BitFramingReg, 0x07)
        Type.push(reqMode)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, Type)

        if ((status != 0) || (returnBits != 16)) {
            status = 2
        }

        return [status, returnBits]
    }

    function AntennaON() {
        temp = SPI_Read(TxControlReg)
        if ((temp & 0x03) != 0x03) {
            SetBits(TxControlReg, 0x03)
        }
    }

    function AvoidColl(): [number, number[]] {
        let SerNum = []
        ChkSerNum = 0
        SPI_Write(BitFramingReg, 0)
        SerNum.push(PICC_ANTICOLL)
        SerNum.push(0x20)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, SerNum)

        if (status == 0) {
            if (returnData.length == 5) {
                for (let k = 0; k <= 3; k++) {
                    ChkSerNum = ChkSerNum ^ returnData[k]
                }
                if (ChkSerNum != returnData[4]) {
                    status = 2
                }
            }
            else {
                status = 2
            }
        }
        return [status, returnData]
    }

    function Crypto1Stop() {
        ClearBits(Status2Reg, 0x08)
    }


    function Authent(authMode: number, BlockAdr: number, Sectorkey: number[], SerNum: number[]) {
        let buff: number[] = []
        buff.push(authMode)
        buff.push(BlockAdr)
        for (let l = 0; l < (Sectorkey.length); l++) {
            buff.push(Sectorkey[l])
        }
        for (let m = 0; m < 4; m++) {
            buff.push(SerNum[m])
        }
        [status, returnData, returnLen] = MFRC522_ToCard(PCD_AUTHENT, buff)
        if (status != 0) {
            serial.writeLine("AUTH ERROR!")
        }
        if ((SPI_Read(Status2Reg) & 0x08) == 0) {
            serial.writeLine("AUTH ERROR2!")
            return 2
        }
        return status
    }

    function MFRC522_ToCard(command: number, sendData: number[]): [number, number[], number] {
        returnData = []
        returnLen = 0
        status = 2
        let irqEN = 0x00
        let waitIRQ = 0x00
        let lastBits = null
        let n = 0

        if (command == PCD_AUTHENT) {
            irqEN = 0x12
            waitIRQ = 0x10
        }

        if (command == PCD_TRANSCEIVE) {
            irqEN = 0x77
            waitIRQ = 0x30
        }

        SPI_Write(0x02, irqEN | 0x80)
        ClearBits(ComIrqReg, 0x80)
        SetBits(FIFOLevelReg, 0x80)
        SPI_Write(CommandReg, PCD_IDLE)

        for (let o = 0; o < (sendData.length); o++) {
            SPI_Write(FIFODataReg, sendData[o])
        }
        SPI_Write(CommandReg, command)

        if (command == PCD_TRANSCEIVE) {
            SetBits(BitFramingReg, 0x80)
        }

        let p = 2000
        while (true) {
            n = SPI_Read(ComIrqReg)
            p--
            if (p == 0 || (n & 0x01) != 0 || (n & waitIRQ) != 0) {
                break
            }
        }
        ClearBits(BitFramingReg, 0x80)

        if (p != 0) {
            if ((SPI_Read(0x06) & 0x1B) == 0x00) {
                status = 0
                if (n & irqEN & 0x01) {
                    status = 1
                }
                if (command == PCD_TRANSCEIVE) {
                    n = SPI_Read(FIFOLevelReg)
                    lastBits = SPI_Read(ControlReg) & 0x07
                    if (lastBits != 0) {
                        returnLen = (n - 1) * 8 + lastBits
                    }
                    else {
                        returnLen = n * 8
                    }
                    if (n == 0) {
                        n = 1
                    }
                    if (n > MAX_LEN) {
                        n = MAX_LEN
                    }
                    for (let q = 0; q < n; q++) {
                        returnData.push(SPI_Read(FIFODataReg))
                    }
                }
            }
            else {
                status = 2
            }
        }

        return [status, returnData, returnLen]
    }

    function TagSelect(SerNum: number[]) {
        let buff: number[] = []
        buff.push(0x93)
        buff.push(0x70)
        for (let r = 0; r < 5; r++) {
            buff.push(SerNum[r])
        }

        let pOut = CRC_Calculation(buff)
        buff.push(pOut[0])
        buff.push(pOut[1])
        let [status, returnData, returnLen] = MFRC522_ToCard(PCD_TRANSCEIVE, buff)
        if ((status == 0) && (returnLen == 0x18)) {
            return returnData[0]
        }
        else {
            return 0
        }
    }

    function CRC_Calculation(DataIn: number[]) {
        ClearBits(DivIrqReg, 0x04)
        SetBits(FIFOLevelReg, 0x80)
        for (let s = 0; s < (DataIn.length); s++) {
            SPI_Write(FIFODataReg, DataIn[s])
        }
        SPI_Write(CommandReg, 0x03)
        let t = 0xFF

        while (true) {
            let v = SPI_Read(DivIrqReg)
            t--
            if (!(t != 0 && !(v & 0x04))) {
                break
            }
        }

        let DataOut: number[] = []
        DataOut.push(SPI_Read(0x22))
        DataOut.push(SPI_Read(0x21))
        return DataOut
    }

    function WriteRFID(blockAdr: number, writeData: number[]): boolean {
        let kommando = [0xA0, blockAdr]
        let crc = CRC_Calculation(kommando)
        kommando.push(crc[0])
        kommando.push(crc[1])

        let [kommandoStatus, kommandoSvar, kommandoBits] = MFRC522_ToCard(PCD_TRANSCEIVE, kommando)
        if (kommandoStatus != 0 || kommandoBits != 4 || (kommandoSvar[0] & 0x0F) != 0x0A) {
            return false
        }

        let data = writeData.slice(0, 16)
        crc = CRC_Calculation(data)
        data.push(crc[0])
        data.push(crc[1])
        let [dataStatus, dataSvar, dataBits] = MFRC522_ToCard(PCD_TRANSCEIVE, data)
        return dataStatus == 0 && dataBits == 4 && (dataSvar[0] & 0x0F) == 0x0A
    }

    function getIDNum(uid: number[]) {
        let a = 0

        for (let e = 0; e < 5; e++) {
            a = a * 256 + uid[e]
        }
        return a
    }

    function readID() {
        [status, Type2] = Request(PICC_REQIDL)

        if (status != 0) {
            return null
        }
        [status, uid] = AvoidColl()

        if (status != 0) {
            return null
        }

        return getIDNum(uid)
    }

    /*
     * Initial setup
     */
    //% block="Initialiser RFID RC522"
    //% weight=100
    export function Init() {
        pins.spiPins(DigitalPin.P15, DigitalPin.P14, DigitalPin.P13)
        pins.spiFormat(8, 0)
        pins.digitalWritePin(DigitalPin.P16, 1)

        // reset module
        SPI_Write(CommandReg, PCD_RESETPHASE)

        SPI_Write(0x2A, 0x8D)
        SPI_Write(0x2B, 0x3E)
        SPI_Write(0x2D, 30)
        SPI_Write(0x2E, 0)
        SPI_Write(0x15, 0x40)
        SPI_Write(0x11, 0x3D)
        AntennaON()
    }

    /*
    * Function to read ID from card
    */
    //% block="Les ID"
    //% weight=95
    export function getID(): number {
        return readID() || 0
    }

    /*
    * Function to read Data from card
    */
    //% block="Les data"
    //% weight=90
    export function read(): string {
        return readFromCard() || ""
    }


    /*
     * Function to write Data
     */
    //% block="Skriv Data %text"
    //% text
    //% weight=85
    export function write(text: string) {
        let id = writeToCard(text)

        while (!id) {
            let id = writeToCard(text)

            if (id != undefined) {
                return
            }
        }
        return
    }

    //% block="skriv og sjekk RFID-kodeord %tekst"
    export function skrivOgSjekk(tekst: string): boolean {
        if (tekst.length == 0 || tekst.length > 48) {
            return false
        }

        // Start med et nytt antennefelt etter at getID() har funnet brikken.
        startAntennefeltPaNytt()
        let kortID = writeToCard(tekst, true)
        if (kortID == 0) {
            return false
        }

        startAntennefeltPaNytt()
        let tilbake = readFromCard(kortID) || ""
        let forventet = tekst
        while (forventet.length < 48) {
            forventet += " "
        }
        if (tilbake.length != 48) {
            serial.writeLine("RFID: ufullstendig tilbakelesing (" + tilbake.length + " av 48 tegn)")
            return false
        }
        if (tilbake != forventet) {
            serial.writeLine("RFID: teksten som ble lest tilbake, er ulik")
            return false
        }

        serial.writeLine("RFID: skriving bekreftet")
        return true
    }

    function startAntennefeltPaNytt() {
        AntennaOff()
        basic.pause(50)
        AntennaON()
        basic.pause(50)
    }

    /*
     * TUrn off antenna
     */
    //% block="Turn off antenna"
    //% text
    //% weight=80
    export function AntennaOff() {
        ClearBits(TxControlReg, 0x03)
    }

}
