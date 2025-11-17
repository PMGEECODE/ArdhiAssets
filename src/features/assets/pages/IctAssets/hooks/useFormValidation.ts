"use client"

import { useState, useCallback } from "react"
import axios from "axios"
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore"

interface ValidationErrors {
  [key: string]: string
}

export const useFormValidation = (isEditing: boolean, assetId?: string) => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [isValidatingSerial, setIsValidatingSerial] = useState(false)
  const [isValidatingTag, setIsValidatingTag] = useState(false)

  const validateSerialNumber = useCallback(
    async (serialNumber: string): Promise<void> => {
      if (!serialNumber.trim()) {
        setValidationErrors((prev) => ({ ...prev, serial_number: "" }))
        return
      }

      setIsValidatingSerial(true)
      setValidationErrors((prev) => ({ ...prev, serial_number: "" }))

      try {
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:3001"
          }/ict-assets/validate-serial${isEditing ? `?asset_id=${assetId}` : ""}`,
          { serial_number: serialNumber },
        )

        const data = response.data

        if (!data.valid) {
          setValidationErrors((prev) => ({
            ...prev,
            serial_number: data.message || "Serial number already exists in the system",
          }))
        } else {
          setValidationErrors((prev) => ({ ...prev, serial_number: "" }))
        }
      } catch (error: any) {
        console.error("Serial validation error:", error)
        const errorMessage = error.response?.data?.detail || error.message || "Failed to validate serial number"
        setValidationErrors((prev) => ({
          ...prev,
          serial_number: errorMessage,
        }))
      } finally {
        setIsValidatingSerial(false)
      }
    },
    [isEditing, assetId],
  )

  const validateTagNumber = useCallback(
    async (tagNumber: string): Promise<void> => {
      if (!tagNumber.trim()) {
        setValidationErrors((prev) => ({ ...prev, tag_number: "" }))
        return
      }

      setIsValidatingTag(true)

      try {
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:3001"
          }/ict-assets/validate-tag${isEditing ? `?asset_id=${assetId}` : ""}`,
          { tag_number: tagNumber },
        )

        const data = response.data

        if (!data.valid) {
          setValidationErrors((prev) => ({ ...prev, tag_number: data.message }))
        } else {
          setValidationErrors((prev) => ({ ...prev, tag_number: "" }))
        }
      } catch (error: any) {
        console.error("Tag validation error:", error)
        const errorMessage = error.response?.data?.detail || error.message || "Failed to validate tag number"
        setValidationErrors((prev) => ({ ...prev, tag_number: errorMessage }))
      } finally {
        setIsValidatingTag(false)
      }
    },
    [isEditing, assetId],
  )

  const validateForm = (formData: Partial<IctAsset>): ValidationErrors => {
    const errors: ValidationErrors = {}

    if (!formData.asset_description?.trim()) {
      errors.asset_description = "Asset description is required"
    }

    if (!formData.serial_number?.trim()) {
      errors.serial_number = "Serial number is required"
    }

    if (!formData.tag_number?.trim()) {
      errors.tag_number = "Tag number is required"
    }

    return errors
  }

  const clearFieldError = (field: string) => {
    setValidationErrors((prev) => ({ ...prev, [field]: "" }))
  }

  return {
    validationErrors,
    setValidationErrors,
    isValidatingSerial,
    isValidatingTag,
    validateSerialNumber,
    validateTagNumber,
    validateForm,
    clearFieldError,
  }
}
