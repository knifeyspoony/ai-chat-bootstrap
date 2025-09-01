import { z } from 'zod'

/**
 * Check if a Zod schema has required parameters
 */
export function hasRequiredParameters(schema: z.ZodSchema): boolean {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    return Object.keys(shape).length > 0
  }
  if (schema instanceof z.ZodVoid || schema instanceof z.ZodUndefined || schema instanceof z.ZodNull) {
    return false
  }
  return true
}

/**
 * Generate simple placeholder text from Zod schema (just parameter names)
 */
export function generatePlaceholder(schema: z.ZodSchema): string {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    const params = Object.keys(shape).map(key => {
      const value = shape[key] as z.ZodSchema
      const isOptional = value instanceof z.ZodOptional || (value as z.ZodOptional<z.ZodTypeAny>).isOptional?.()
      return isOptional ? `${key}?` : key
    })
    return params.join(' ')
  }
  return ''
}

/**
 * Extract detailed parameter information from Zod schema
 */
export function getParameterInfo(schema: z.ZodSchema): Array<{
  name: string
  type: string
  description?: string
  isOptional: boolean
  defaultValue?: unknown
}> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    return Object.entries(shape).map(([key, value]) => {
      const zodSchema = value as z.ZodSchema
      const isOptional = zodSchema instanceof z.ZodOptional || (zodSchema as z.ZodOptional<z.ZodTypeAny>).isOptional?.()
      const description = (zodSchema as z.ZodTypeAny)._def?.description
      let defaultValue: unknown = undefined
      
      // Extract default value if present
      if (zodSchema instanceof z.ZodDefault) {
        defaultValue = zodSchema._def.defaultValue
      }
      
      return {
        name: key,
        type: getZodType(zodSchema),
        description,
        isOptional,
        defaultValue
      }
    })
  }
  return []
}

/**
 * Get current parameter index based on input text and cursor position
 */
export function getCurrentParameterIndex(input: string, cursorPosition: number, schema: z.ZodSchema): number {
  if (!(schema instanceof z.ZodObject)) return 0
  
  // Get the argument part after command name
  const parts = input.split(' ')
  if (parts.length <= 1) return 0
  
  const argsText = parts.slice(1).join(' ')
  const cursorInArgs = Math.max(0, cursorPosition - parts[0].length - 1)
  
  // Count spaces before cursor to determine which parameter we're on
  const beforeCursor = argsText.substring(0, cursorInArgs)
  const spaceCount = (beforeCursor.match(/ /g) || []).length
  
  const paramKeys = Object.keys(schema.shape)
  return Math.min(spaceCount, paramKeys.length - 1)
}

/**
 * Get human-readable type from Zod schema
 */
function getZodType(schema: z.ZodSchema): string {
  if (schema instanceof z.ZodString) return 'string'
  if (schema instanceof z.ZodNumber) return 'number'
  if (schema instanceof z.ZodBoolean) return 'boolean'
  if (schema instanceof z.ZodEnum) {
    const values = schema.options || (schema as z.ZodTypeAny)._def?.values
    if (values) return values.join('|')
    return 'enum'
  }
  if (schema instanceof z.ZodOptional) return getZodType(schema.unwrap())
  if (schema instanceof z.ZodDefault) return getZodType(schema._def.innerType)
  if (schema instanceof z.ZodArray) return `${getZodType(schema.element)}[]`
  return 'any'
}

/**
 * Check if all required parameters are provided in the input
 */
export function hasAllRequiredParams(argsString: string, schema: z.ZodSchema): boolean {
  if (!(schema instanceof z.ZodObject)) return true
  
  const shape = schema.shape
  const requiredParams = Object.entries(shape).filter(([_, value]) => {
    const zodSchema = value as z.ZodSchema
    return !(zodSchema instanceof z.ZodOptional || (zodSchema as z.ZodOptional<z.ZodTypeAny>).isOptional?.())
  })
  
  if (requiredParams.length === 0) return true
  
  if (!argsString.trim()) return false
  
  // For single parameter commands, check if we have any input
  if (requiredParams.length === 1) {
    return argsString.trim().length > 0
  }
  
  // For multiple parameters, count provided args
  const args = argsString.split(/[\s,]+/).filter(Boolean)
  return args.length >= requiredParams.length
}

/**
 * Parse string arguments into parameters based on Zod schema
 */
export function parseArgsToParams(argsString: string, schema: z.ZodSchema): unknown {
  if (!argsString.trim()) {
    // Return empty object for commands with no args
    return {}
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    const keys = Object.keys(shape)
    
    if (keys.length === 1) {
      // Single parameter - use the whole string
      const key = keys[0]
      const paramSchema = shape[key] as z.ZodSchema
      return { [key]: parseValue(argsString.trim(), paramSchema) }
    } else {
      // Multiple parameters - split by spaces/commas
      const args = argsString.split(/[\s,]+/).filter(Boolean)
      const result: Record<string, unknown> = {}
      
      keys.forEach((key, index) => {
        if (index < args.length) {
          const paramSchema = shape[key] as z.ZodSchema
          result[key] = parseValue(args[index], paramSchema)
        }
      })
      
      return result
    }
  }
  
  return {}
}

/**
 * Parse a single value based on its Zod schema type
 */
function parseValue(value: string, schema: z.ZodSchema): unknown {
  // Handle optional and default schemas
  if (schema instanceof z.ZodOptional) {
    return parseValue(value, schema.unwrap())
  }
  if (schema instanceof z.ZodDefault) {
    return parseValue(value, schema._def.innerType)
  }
  
  if (schema instanceof z.ZodNumber) {
    const num = Number(value)
    return isNaN(num) ? value : num
  }
  
  if (schema instanceof z.ZodBoolean) {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
    return value
  }
  
  if (schema instanceof z.ZodEnum) {
    const values = schema.options || (schema as z.ZodTypeAny)._def?.values
    if (values && values.includes(value)) return value
    // Return the value anyway and let Zod validation handle it
    return value
  }
  
  // Default to string
  return value
}