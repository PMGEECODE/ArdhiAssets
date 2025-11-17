// src/pages/DeviceForm.tsx
import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import ConfirmExcelModal from "../../components/ui/ConfirmExcelModal";
import axios from "axios";
import * as XLSX from "xlsx";
import { ChevronRight, Home, Plus } from "lucide-react";

const DeviceForm: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const [form_data, set_form_data] = useState({
    hostname: "",
    last_seen: "",
    first_seen: "",
    platform: "",
    os_version: "",
    os_build: "",
    os_product_name: "",
    model: "",
    manufacturer: "",
    type: "",
    chassis: "",
    local_ip: "",
    domain: "",
    mac_address: "",
    cpu_id: "",
    serial_number: "",
    location: "",
    room_or_floor: "",
    assigned_to: "",
  });

  const [error, set_error] = useState<string | null>(null);
  const [success, set_success] = useState<string | null>(null);
  const [excel_data, set_excel_data] = useState<any[]>([]);
  const [show_modal, set_show_modal] = useState<boolean>(false);
  const [is_submitting, set_is_submitting] = useState(false);
  const [is_uploading, set_is_uploading] = useState(false);
  const [upload_progress, set_upload_progress] = useState<number>(0);
  const [is_processing_excel, setIs_processing_excel] = useState(false);

  const file_input_ref = useRef<HTMLInputElement | null>(null);

  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handle_file_upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded_file = e.target.files?.[0];
    if (!uploaded_file) return;

    setIs_processing_excel(true);
    set_upload_progress(0);

    const reader = new FileReader();

    reader.onload = (event) => {
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        set_upload_progress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json_data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Debug: Log the actual column names from Excel
      console.log("Excel columns found:", Object.keys(json_data[0] || {}));
      console.log("First row data:", json_data[0]);

      const mapped_data = json_data.map((row: any) => ({
        hostname: row["Hostname"] || row["hostname"] || "",
        lastSeen: row["Last Seen"] || row["LastSeen"] || row["last_seen"] || "",
        firstSeen:
          row["First Seen"] || row["FirstSeen"] || row["first_seen"] || "",
        platform: row["Platform"] || row["platform"] || "",
        osVersion:
          row["OS Version"] || row["OSVersion"] || row["os_version"] || "",
        osBuild: row["OS Build"] || row["OSBuild"] || row["os_build"] || "",
        osProductName:
          row["OS Product Name"] ||
          row["OSProductName"] ||
          row["os_product_name"] ||
          "",
        model: row["Model"] || row["model"] || "",
        manufacturer: row["Manufacturer"] || row["manufacturer"] || "",
        type: row["Type"] || row["type"] || "",
        chassis: row["Chassis"] || row["chassis"] || "",
        localIp: row["Local IP"] || row["LocalIP"] || row["local_ip"] || "",
        domain: row["Domain"] || row["domain"] || "",
        macAddress:
          row["MAC Address"] || row["MACAddress"] || row["mac_address"] || "",
        cpuId: row["CPUID"] || row["CPUID"] || row["cpu_id"] || "",
        serialNumber:
          row["Serial Number"] ||
          row["SerialNumber"] ||
          row["serial_number"] ||
          "",
        location: row["Location"] || row["location"] || "",
        roomOrFloor:
          row["Room/Floor"] || row["RoomFloor"] || row["room_or_floor"] || "",
        assignedTo:
          row["Assigned To"] || row["AssignedTo"] || row["assigned_to"] || "",
      }));

      console.log("Mapped data:", mapped_data);

      // Complete the progress
      set_upload_progress(100);
      setTimeout(() => {
        setIs_processing_excel(false);
        set_upload_progress(0);
        set_excel_data(mapped_data);
        set_show_modal(true);
      }, 500);
    };

    reader.readAsArrayBuffer(uploaded_file);
  };

  const is_valid_date = (date_str: string) => {
    const d = new Date(date_str);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const get_token = (): string | null => {
    try {
      const auth_storage = localStorage.getItem("auth-storage");
      if (auth_storage) {
        const parsed = JSON.parse(auth_storage);
        return parsed?.state?.token || null;
      }
    } catch (err) {
      console.error("❌ Failed to parse auth token:", err);
    }
    return null;
  };

  const handle_submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (is_submitting) return;

    set_is_submitting(true);
    set_error(null);
    set_success(null);

    const token = get_token();
    if (!token) {
      set_error("Authentication token not found. Please log in again.");
      set_is_submitting(false);
      return;
    }

    const clean_form_data = {
      ...form_data,
      last_seen: is_valid_date(form_data.last_seen)
        ? new Date(form_data.last_seen).toISOString()
        : null,
      first_seen: is_valid_date(form_data.first_seen)
        ? new Date(form_data.first_seen).toISOString()
        : null,
    };

    try {
      await axios.post(`${API_URL}/devices`, clean_form_data, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      set_success("Device added successfully!");
      setTimeout(() => navigate("/devices"), 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to create device";
      set_error(message);
    } finally {
      set_is_submitting(false);
    }
  };

  const handle_excel_submit = async (data_to_upload?: any[]) => {
    if (is_uploading) return;

    set_is_uploading(true);
    set_upload_progress(0);
    set_error(null);
    set_success(null);

    // Use the passed data or fall back to excel_data
    const data_to_process = data_to_upload || excel_data;

    if (data_to_process.length === 0) {
      set_error("No data found in the Excel file.");
      set_is_uploading(false);
      set_upload_progress(0);
      return;
    }

    const token = get_token();
    if (!token) {
      set_error("Authentication token not found. Please log in again.");
      set_is_uploading(false);
      set_upload_progress(0);
      return;
    }

    try {
      const hostnames = data_to_process.map((device) => device.hostname);

      // Check hostnames first
      set_upload_progress(20);
      const response = await axios.post(
        `${API_URL}/devices/check-hostnames`,
        { hostnames },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      set_upload_progress(40);
      const existing_hostnames = response.data.existing_hostnames;
      const devices_to_insert = data_to_process.filter(
        (device) => !existing_hostnames.includes(device.hostname)
      );

      if (devices_to_insert.length > 0) {
        set_upload_progress(60);

        // Create axios instance with upload progress
        const uploadAxios = axios.create();
        uploadAxios.interceptors.request.use((config) => {
          config.onUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              set_upload_progress(60 + progress * 0.3); // 60% to 90%
            }
          };
          return config;
        });

        await uploadAxios.post(
          `${API_URL}/devices/upload-excel-data`,
          { data: devices_to_insert },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );

        set_upload_progress(100);
        set_success("Excel data uploaded successfully!");

        setTimeout(() => {
          set_show_modal(false);
          set_upload_progress(0);
        }, 1000);
      } else {
        set_upload_progress(100);
        set_error("All devices in the Excel file already exist.");
        setTimeout(() => {
          set_upload_progress(0);
        }, 1000);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to upload excel data";
      set_error(message);
      set_upload_progress(0);
    } finally {
      set_is_uploading(false);
    }
  };

  const render_input = (key: string, label?: string) => (
    <div key={key} className="col-span-1">
      <label
        htmlFor={key}
        className="block mb-1 text-sm font-medium text-gray-700 capitalize"
      >
        {label || key.replace(/_/g, " ")}
      </label>
      <input
        id={key}
        type={
          key.includes("date") || key.includes("seen")
            ? "datetime-local"
            : "text"
        }
        name={key}
        value={form_data[key as keyof typeof form_data]}
        onChange={handle_change}
        className="px-3 py-2 w-full rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="p-2 mx-auto">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center mb-6 space-x-2 text-sm text-gray-600">
        <Link
          to="/"
          className="flex items-center transition-colors hover:text-blue-600"
        >
          <Home size={16} className="mr-1" />
          Home
        </Link>
        <ChevronRight size={16} />
        <Link to="/devices" className="transition-colors hover:text-blue-600">
          Devices
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Plus size={16} className="mr-1" />
          Add New Device
        </span>
      </nav>

      <h2 className="mb-6 text-2xl font-bold text-left">Add New Device</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      <form onSubmit={handle_submit} className="space-y-10">
        {/* Device Identity */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Device Identity</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              "hostname",
              "model",
              "manufacturer",
              "type",
              "chassis",
              "serial_number",
            ].map((key) => render_input(key))}
          </div>
        </div>

        {/* OS Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Operating System</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {["platform", "os_version", "os_build", "os_product_name"].map(
              (key) => render_input(key)
            )}
          </div>
        </div>

        {/* Network Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Network Info</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {["local_ip", "domain", "mac_address", "cpu_id"].map((key) =>
              render_input(key)
            )}
          </div>
        </div>

        {/* Device Placement */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Device Placement</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {["location", "room_or_floor", "assigned_to"].map((key) =>
              render_input(key)
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Timestamps</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {["first_seen", "last_seen"].map((key) =>
              render_input(key, key.replace(/_/g, " "))
            )}
          </div>
        </div>

        {/* Excel Upload */}
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Excel File
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Ready to upload</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* File Input */}
            <div className="relative">
              <input
                ref={file_input_ref}
                type="file"
                accept=".xlsx, .xls"
                onChange={handle_file_upload}
                className="block w-full text-sm text-gray-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                disabled={is_processing_excel || is_uploading}
              />
            </div>

            {/* Progress Bar */}
            {(is_processing_excel || is_uploading) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {is_processing_excel
                      ? "Processing Excel file..."
                      : "Uploading to server..."}
                  </span>
                  <span>{Math.round(upload_progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${upload_progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {is_processing_excel && "Reading and mapping Excel data..."}
                  {is_uploading && "Sending data to server..."}
                </div>
              </div>
            )}

            {/* Status Messages */}
            {is_processing_excel && (
              <div className="flex items-center p-3 space-x-2 text-blue-600 bg-blue-50 rounded-md">
                <div className="w-4 h-4 rounded-full border-2 border-blue-600 animate-spin border-t-transparent"></div>
                <span className="text-sm font-medium">
                  Processing Excel file...
                </span>
              </div>
            )}

            {is_uploading && (
              <div className="flex items-center p-3 space-x-2 text-green-600 bg-green-50 rounded-md">
                <div className="w-4 h-4 rounded-full border-2 border-green-600 animate-spin border-t-transparent"></div>
                <span className="text-sm font-medium">
                  Uploading to server...
                </span>
              </div>
            )}

            {/* File Info */}
            {excel_data.length > 0 && !is_processing_excel && !is_uploading && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700">
                    {excel_data.length} device(s) ready for review
                  </span>
                </div>
                <button
                  onClick={() => set_show_modal(true)}
                  className="text-sm font-medium text-green-700 hover:text-green-800"
                >
                  Review Data →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={is_submitting}>
            {is_submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>

      <ConfirmExcelModal
        show={show_modal}
        data={excel_data}
        onConfirm={handle_excel_submit}
        onCancel={() => {
          set_show_modal(false);
          if (file_input_ref.current) file_input_ref.current.value = "";
        }}
        isLoading={is_uploading}
      />
    </div>
  );
};

export default DeviceForm;
