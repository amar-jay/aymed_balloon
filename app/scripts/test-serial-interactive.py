#!/usr/bin/env python3
"""
Interactive serial test - send commands and receive data
Run with: python test_serial_interactive.py [baudRate]
"""

import sys
import serial
import serial.tools.list_ports
import threading
from datetime import datetime

def list_usb_devices():
    ports = serial.tools.list_ports.comports()
    usb_ports = [
        p for p in ports
        if ("USB" in p.device or 
            "ACM" in p.device or 
            "ttyUSB" in p.device or 
            "ttyACM" in p.device or
            "COM" in p.device)
    ]
    return usb_ports


def reader_thread(port):
    """Background thread that prints incoming serial data."""
    while True:
        try:
            line = port.readline().decode(errors="replace").strip()
            if line:
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f"\n[{timestamp}] << {line}")
                print("> ", end="", flush=True)
        except Exception as e:
            print(f"\n❌ Read error: {e}")
            break


def interactive_test(device_path, baud_rate=9600):
    print(f"\n🔌 Connecting to {device_path} at {baud_rate} baud...")
    
    try:
        port = serial.Serial(device_path, baud_rate, timeout=0.1)
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)

    print("✅ Connected!\n")
    print("Commands you can try:")
    print("  - Type any text and press Enter to send")
    print("  - Type 'exit' to quit")
    print("  - Try typical commands: 'status', 'info', 'help', '?'")
    print()

    # Start background thread for reading
    threading.Thread(target=reader_thread, args=(port,), daemon=True).start()

    msg_count = 0

    while True:
        try:
            cmd = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            cmd = "exit"

        if cmd.lower() == "exit":
            print("\n👋 Closing connection...")
            port.close()
            print(f"Total messages received: {msg_count}")
            break

        if cmd:
            try:
                port.write((cmd + "\n").encode())
                print(f">> Sent: {cmd}")
            except Exception as e:
                print(f"❌ Write error: {e}")


def main():
    print("🔧 Interactive Serial Test")
    print("==========================")

    usb_ports = list_usb_devices()
    if not usb_ports:
        print("❌ No USB serial devices found")
        sys.exit(1)

    print("\nAvailable USB devices:")
    for i, p in enumerate(usb_ports):
        name = p.description or ""
        print(f"  [{i}] {p.device} - {name}")

    chosen = 0  # default to first detected device

    device_path = usb_ports[chosen].device
    baud_rate = int(sys.argv[1]) if len(sys.argv) > 1 else 9600

    print(f"\nUsing: {device_path}")
    interactive_test(device_path, baud_rate)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"💥 Error: {e}")
        sys.exit(1)
