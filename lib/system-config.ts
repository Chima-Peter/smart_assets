import "server-only"
import { prisma } from "./prisma"

export type ConfigType = "BOOLEAN" | "STRING" | "NUMBER"

interface SystemConfigValue {
  value: string
  type?: ConfigType
}

/**
 * Get a system configuration value
 * @param key Configuration key
 * @param defaultValue Default value if not found
 * @returns The configuration value, parsed according to type
 */
export async function getSystemConfig(
  key: string,
  defaultValue?: string
): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    })

    if (!config) {
      return defaultValue ?? null
    }

    return config.value
  } catch (error) {
    console.error(`Error fetching system config for key ${key}:`, error)
    return defaultValue ?? null
  }
}

/**
 * Get a boolean system configuration value
 * @param key Configuration key
 * @param defaultValue Default value if not found
 * @returns The boolean value
 */
export async function getSystemConfigBoolean(
  key: string,
  defaultValue: boolean = false
): Promise<boolean> {
  try {
    const value = await getSystemConfig(key)
    if (value === null) {
      return defaultValue
    }
    return value.toLowerCase() === "true" || value === "1"
  } catch (error) {
    console.error(`Error parsing boolean config for key ${key}:`, error)
    return defaultValue
  }
}

/**
 * Get a number system configuration value
 * @param key Configuration key
 * @param defaultValue Default value if not found
 * @returns The number value
 */
export async function getSystemConfigNumber(
  key: string,
  defaultValue: number = 0
): Promise<number> {
  try {
    const value = await getSystemConfig(key)
    if (value === null) {
      return defaultValue
    }
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  } catch (error) {
    console.error(`Error parsing number config for key ${key}:`, error)
    return defaultValue
  }
}

/**
 * Check if barcode scanning is enabled
 */
export async function isBarcodeScanningEnabled(): Promise<boolean> {
  return await getSystemConfigBoolean("feature.barcode.scanning", true)
}

/**
 * Check if email notifications are enabled
 */
export async function isEmailNotificationEnabled(): Promise<boolean> {
  return await getSystemConfigBoolean("notification.email.enabled", true)
}

/**
 * Check if SMS notifications are enabled
 */
export async function isSMSNotificationEnabled(): Promise<boolean> {
  return await getSystemConfigBoolean("notification.sms.enabled", false)
}

