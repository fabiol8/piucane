'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface LocationState {
  location: { lat: number; lng: number } | null
  loading: boolean
  error: string | null
  accuracy: number | null
  timestamp: number | null
  hasPermission: boolean | null
}

interface UseCurrentLocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchPosition?: boolean
  onLocationChange?: (location: { lat: number; lng: number }) => void
  onError?: (error: string) => void
}

export function useCurrentLocation(options: UseCurrentLocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watchPosition = false,
    onLocationChange,
    onError
  } = options

  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    accuracy: null,
    timestamp: null,
    hasPermission: null
  })

  const watchIdRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!isSupported) return false

    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        const hasPermission = permission.state === 'granted'
        setState(prev => ({ ...prev, hasPermission }))
        return hasPermission
      }
      return null
    } catch (error) {
      console.warn('Could not check geolocation permission:', error)
      return null
    }
  }, [isSupported])

  // Get current position
  const getCurrentPosition = useCallback(async (force: boolean = false): Promise<{ lat: number; lng: number } | null> => {
    if (!isSupported) {
      const errorMsg = 'Geolocalizzazione non supportata dal browser'
      setState(prev => ({ ...prev, error: errorMsg }))
      onError?.(errorMsg)
      return null
    }

    // Return cached location if not forcing refresh and within max age
    if (!force && state.location && state.timestamp) {
      const age = Date.now() - state.timestamp
      if (age < maximumAge) {
        return state.location
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      abortControllerRef.current = new AbortController()

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout nella localizzazione'))
        }, timeout)

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId)
            resolve(pos)
          },
          (err) => {
            clearTimeout(timeoutId)
            reject(err)
          },
          {
            enableHighAccuracy,
            timeout,
            maximumAge
          }
        )

        // Handle abort
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          reject(new Error('Richiesta annullata'))
        })
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      setState(prev => ({
        ...prev,
        location,
        loading: false,
        error: null,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        hasPermission: true
      }))

      onLocationChange?.(location)
      return location

    } catch (error: any) {
      let errorMessage = 'Errore nella localizzazione'

      switch (error.code) {
        case GeolocationPositionError.PERMISSION_DENIED:
          errorMessage = 'Accesso alla posizione negato'
          setState(prev => ({ ...prev, hasPermission: false }))
          break
        case GeolocationPositionError.POSITION_UNAVAILABLE:
          errorMessage = 'Posizione non disponibile'
          break
        case GeolocationPositionError.TIMEOUT:
          errorMessage = 'Timeout nella localizzazione'
          break
        default:
          errorMessage = error.message || errorMessage
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))

      onError?.(errorMessage)
      return null
    }
  }, [isSupported, state.location, state.timestamp, maximumAge, enableHighAccuracy, timeout, onLocationChange, onError])

  // Start watching position
  const startWatching = useCallback(() => {
    if (!isSupported || watchIdRef.current !== null) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }

        setState(prev => ({
          ...prev,
          location,
          loading: false,
          error: null,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          hasPermission: true
        }))

        onLocationChange?.(location)
      },
      (error) => {
        let errorMessage = 'Errore nel tracking della posizione'

        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            errorMessage = 'Accesso alla posizione negato'
            setState(prev => ({ ...prev, hasPermission: false }))
            break
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            errorMessage = 'Posizione non disponibile'
            break
          case GeolocationPositionError.TIMEOUT:
            errorMessage = 'Timeout nel tracking'
            break
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))

        onError?.(errorMessage)
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    )
  }, [isSupported, enableHighAccuracy, timeout, maximumAge, onLocationChange, onError])

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Request permission and get location
  const requestLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    // First check/request permission
    await checkPermission()

    // Then get current position
    return getCurrentPosition(true)
  }, [checkPermission, getCurrentPosition])

  // Abort current request
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(prev => ({ ...prev, loading: false }))
  }, [])

  // Reset state
  const reset = useCallback(() => {
    abort()
    stopWatching()
    setState({
      location: null,
      loading: false,
      error: null,
      accuracy: null,
      timestamp: null,
      hasPermission: null
    })
  }, [abort, stopWatching])

  // Auto-watch if enabled
  useEffect(() => {
    if (watchPosition && isSupported) {
      startWatching()
      return () => stopWatching()
    }
  }, [watchPosition, isSupported, startWatching, stopWatching])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort()
      stopWatching()
    }
  }, [abort, stopWatching])

  return {
    // State
    ...state,
    isSupported,

    // Actions
    getCurrentPosition,
    requestLocation,
    startWatching,
    stopWatching,
    checkPermission,
    abort,
    reset,

    // Utils
    isLocationStale: state.timestamp ? (Date.now() - state.timestamp) > maximumAge : true,
    canRequestLocation: isSupported && !state.loading,
    hasRecentLocation: state.location && state.timestamp && (Date.now() - state.timestamp) < maximumAge
  }
}

// Utility hook for permission status only
export function useGeolocationPermission() {
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const checkSupport = () => {
      setIsSupported('geolocation' in navigator && 'permissions' in navigator)
    }

    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          setPermission(permission.state)

          // Listen for permission changes
          permission.addEventListener('change', () => {
            setPermission(permission.state)
          })
        } catch (error) {
          console.warn('Could not check geolocation permission:', error)
        }
      }
    }

    checkSupport()
    checkPermission()
  }, [])

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isPrompt: permission === 'prompt'
  }
}