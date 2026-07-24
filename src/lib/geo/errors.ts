export type GeoErrorCode =
  | 'quota'
  | 'denied'
  | 'no_results'
  | 'out_of_zone'
  | 'unavailable'
  | 'invalid_request';

export class GeoError extends Error {
  readonly code: GeoErrorCode;

  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.name = 'GeoError';
    this.code = code;
  }
}

export function geoErrorMessage(code: GeoErrorCode): string {
  switch (code) {
    case 'quota':
      return 'Maps quota exceeded. Try again later.';
    case 'denied':
      return 'Location access was denied.';
    case 'no_results':
      return 'No matching address found.';
    case 'out_of_zone':
      return 'Outside YADA delivery area (KNUST/Ayeduase).';
    case 'unavailable':
      return 'Maps service is temporarily unavailable.';
    case 'invalid_request':
      return 'Invalid location request.';
  }
}

export function mapGoogleStatusToGeoError(status: string): GeoError {
  switch (status) {
    case 'OVER_QUERY_LIMIT':
    case 'OVER_DAILY_LIMIT':
      return new GeoError('quota', geoErrorMessage('quota'));
    case 'REQUEST_DENIED':
      return new GeoError('denied', geoErrorMessage('denied'));
    case 'ZERO_RESULTS':
      return new GeoError('no_results', geoErrorMessage('no_results'));
    case 'INVALID_REQUEST':
      return new GeoError('invalid_request', geoErrorMessage('invalid_request'));
    default:
      return new GeoError('unavailable', geoErrorMessage('unavailable'));
  }
}
