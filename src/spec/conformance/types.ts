// Types for CEL conformance tests
export interface ConformanceTestValue {
  int64_value?: number
  uint64_value?: number
  double_value?: number
  string_value?: string
  bytes_value?: string
  bool_value?: boolean
  null_value?: null
  type_value?: string
  list_value?: {
    values?: ConformanceTestValue[]
  }
  map_value?: {
    entries?: Array<{
      key: ConformanceTestValue
      value: ConformanceTestValue
    }>
  }
}

export interface ConformanceTestError {
  errors?: Array<{
    message: string
  }>
}

export interface ConformanceTypeEnv {
  name: string
  ident: {
    type: {
      primitive?: string
    }
  }
}

export interface ConformanceTestCase {
  name: string
  description?: string
  expr: string
  value?: ConformanceTestValue
  eval_error?: ConformanceTestError
  type_env?: ConformanceTypeEnv[]
  bindings?: Record<string, { value: ConformanceTestValue }>
  disable_check?: boolean
}

export interface ConformanceTestSection {
  name: string
  description?: string
  test: ConformanceTestCase[]
}

export interface ConformanceTestFile {
  name: string
  description?: string
  section: ConformanceTestSection[]
}
