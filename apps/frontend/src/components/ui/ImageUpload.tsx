import { inputClass } from './styles'

export function ImageUpload({
  name,
  label,
  file,
  required,
  optional,
  onChange,
}: {
  name: string
  label: string
  file?: File | null
  required?: boolean
  optional?: boolean
  onChange?: (file: File | null) => void
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {optional && <span className="font-normal text-muted"> (optional)</span>}
      <input
        className={`${inputClass} mt-2`}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        required={required && !file}
        onChange={(event) => onChange?.(event.target.files?.[0] ?? null)}
      />
      {file && (
        <span className="mt-1 block break-all font-normal text-muted">
          {file.name}
        </span>
      )}
    </label>
  )
}
