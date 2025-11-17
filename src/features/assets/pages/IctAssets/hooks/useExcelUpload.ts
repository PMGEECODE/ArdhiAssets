"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import * as XLSX from "xlsx"

export const useExcelUpload = () => {
  const [excelData, setExcelData] = useState<any[]>([])
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setIsProcessingExcel(true)
    setUploadProgress(0)

    const reader = new FileReader()

    reader.onload = (event) => {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

      const mappedData = jsonData.map((row: any) => ({
        asset_description: row["Asset Description"] || row["asset_description"] || "",
        financed_by: row["Financed By"] || row["financed_by"] || "",
        serial_number: row["Serial Number"] || row["serial_number"] || "",
        tag_number: row["Tag Number"] || row["tag_number"] || "",
        make_model: row["Make/Model"] || row["make_model"] || "",
        purchase_amount: Number.parseFloat(row["Purchase Amount"] || row["purchase_amount"] || "0") || 0,
        pv_number: row["PV Number"] || row["pv_number"] || undefined,
        asset_type: row["Asset Type"] || row["asset_type"] || undefined,
        specifications: row["Specifications"] || row["specifications"] || undefined,
        software_licenses: row["Software Licenses"] || row["software_licenses"] || undefined,
        ip_address: row["IP Address"] || row["ip_address"] || undefined,
        mac_address: row["MAC Address"] || row["mac_address"] || undefined,
        operating_system: row["Operating System"] || row["operating_system"] || undefined,
        original_location: row["Original Location"] || row["original_location"] || undefined,
        current_location: row["Current Location"] || row["current_location"] || undefined,
        responsible_officer: row["Responsible Officer"] || row["responsible_officer"] || undefined,
        delivery_installation_date: row["Delivery/Installation Date"] || row["delivery_installation_date"] || undefined,
        replacement_date: row["Replacement Date"] || row["replacement_date"] || undefined,
        disposal_date: row["Disposal Date"] || row["disposal_date"] || undefined,
        depreciation_rate: Number.parseFloat(row["Depreciation Rate"] || row["depreciation_rate"] || "0") || undefined,
        annual_depreciation:
          Number.parseFloat(row["Annual Depreciation"] || row["annual_depreciation"] || "0") || undefined,
        accumulated_depreciation:
          Number.parseFloat(row["Accumulated Depreciation"] || row["accumulated_depreciation"] || "0") || undefined,
        net_book_value: Number.parseFloat(row["Net Book Value"] || row["net_book_value"] || "0") || undefined,
        disposal_value: Number.parseFloat(row["Disposal Value"] || row["disposal_value"] || "0") || undefined,
        asset_condition: row["Asset Condition"] || row["asset_condition"] || undefined,
        notes: row["Notes"] || row["notes"] || undefined,
        previous_owner: row["Previous Owner"] || row["previous_owner"] || undefined,
        transfer_department: row["Transfer Department"] || row["transfer_department"] || undefined,
        transfer_location: row["Transfer Location"] || row["transfer_location"] || undefined,
        transfer_room_or_floor: row["Transfer Room/Floor"] || row["transfer_room_or_floor"] || undefined,
        transfer_reason: row["Transfer Reason"] || row["transfer_reason"] || undefined,
      }))

      setUploadProgress(100)
      setTimeout(() => {
        setIsProcessingExcel(false)
        setUploadProgress(0)
        setExcelData(mappedData)
        setShowExcelModal(true)
      }, 500)
    }

    reader.readAsArrayBuffer(uploadedFile)
  }, [])

  const handleExcelSubmit = useCallback(
    async (dataToUpload?: any[]) => {
      if (isUploading) return

      setIsUploading(true)
      setUploadProgress(0)

      const dataToProcess = dataToUpload || excelData

      if (dataToProcess.length === 0) {
        toast.error("No data found in the Excel file.")
        setIsUploading(false)
        setUploadProgress(0)
        return
      }

      try {
        const serialNumbers = dataToProcess.map((asset) => asset.serial_number)

        setUploadProgress(20)
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/ict-assets/check-serial-numbers`,
          { serialNumbers }, // Changed from snake_case to camelCase to match variable name
          { withCredentials: true },
        )

        setUploadProgress(40)
        const existingSerialNumbers = response.data.existing_serial_numbers || []
        const assetsToInsert = dataToProcess.filter((asset) => !existingSerialNumbers.includes(asset.serial_number))

        if (assetsToInsert.length > 0) {
          setUploadProgress(60)

          const uploadAxios = axios.create()
          uploadAxios.interceptors.request.use((config) => {
            config.onUploadProgress = (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                setUploadProgress(60 + progress * 0.3)
              }
            }
            return config
          })

          await uploadAxios.post(
            `${import.meta.env.VITE_API_URL}/ict-assets/upload-excel-data`,
            { data: assetsToInsert },
            { withCredentials: true },
          )

          setUploadProgress(100)
          toast.success("Excel data uploaded successfully!")

          return { success: true }
        } else {
          setUploadProgress(100)
          toast.error("All assets in the Excel file already exist.")
          return { success: false }
        }
      } catch (err: any) {
        const message = err.response?.data?.message || "Failed to upload excel data"
        toast.error(message)
        setUploadProgress(0)
        return { success: false }
      } finally {
        setIsUploading(false)
      }
    },
    [excelData, isUploading],
  )

  const resetExcelData = () => {
    setExcelData([])
    setShowExcelModal(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return {
    excelData,
    showExcelModal,
    isUploading,
    uploadProgress,
    isProcessingExcel,
    fileInputRef,
    handleFileUpload,
    handleExcelSubmit,
    setShowExcelModal,
    resetExcelData,
  }
}
