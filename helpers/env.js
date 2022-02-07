export function getEnvironmentVariable(key) {
  if (! process.env[key]) {
    throw new Error(`Please set the "${key}" environment variable.`)
  }

  return process.env[key] || ""
}