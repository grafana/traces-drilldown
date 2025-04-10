export function processColumns(existingColumns: string, additionalColumns: string[]): string {
  const columnsSet = new Set<string>();
  
  if (existingColumns) {
    existingColumns.split(',').forEach(col => columnsSet.add(col.trim()));
  }
  
  additionalColumns.forEach(col => columnsSet.add(col));
  
  return Array.from(columnsSet).join(', ');
}

export const DEFAULT_HTTP_SPAN_COLUMNS = [
  'span.http.method', 
  'span.http.request.method', 
  'span.http.route', 
  'span.http.path', 
  'span.http.status_code', 
  'span.http.response.status_code'
]; 
