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
  enum_value?: {
    type: string
    value: number
  }
  list_value?: {
    values?: ConformanceTestValue[]
  }
  map_value?: {
    entries?: Array<{
      key: ConformanceTestValue
      value: ConformanceTestValue
    }>
  }
  object_value?: {
    typeUrl?: string
    value?: any
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
      message_type?: string
      list_type?: {
        elem_type?: {
          primitive?: string
          message_type?: string
        }
      }
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
  container?: string
  check_only?: boolean
  typed_result?: {
    deduced_type?: {
      primitive?: string
      dyn?: {}
      list_type?: {
        elem_type?: {
          primitive?: string
          dyn?: {}
        }
      }
      map_type?: {
        key_type?: {
          primitive?: string
        }
        value_type?: {
          primitive?: string
          dyn?: {}
        }
      }
      message_type?: string
      abstract_type?: {
        name: string
        parameter_types?: any[]
      }
    }
  }
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
