export function debounce(cb: (...args: unknown[]) => void, delay: number) {
  let timeout: NodeJS.Timeout
  return (...args: unknown[]) => {
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      cb(...args)
    }, delay)
  }
}

export function throttle(cb: (...args: unknown[]) => void, limit: number) {
  var wait = false
  return (...args: unknown[]) => {
    if (!wait) {
      cb(...args)
      wait = true
      setTimeout(() => (wait = false), limit)
    }
  }
}
