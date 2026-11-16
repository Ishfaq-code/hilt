import { mediaUrl } from '../../lib/platform'
import { useState } from 'react'
import { clubTagOptions } from '../../lib/clubTags'
import type { Organization } from '../../types'
import { buttonClass, inputClass, panelClass } from '../ui/styles'
import { TagPicker } from './TagPicker'
import { ImageUpload } from '../ui/ImageUpload'

import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'

type Props = Pick<OrganizationManagement, 'saveOrganization' | 'saving'> & {
  organization: Organization
}

export function OrganizationInfo({
  organization,
  saveOrganization,
  saving,
}: Props) {
  const [tags, setTags] = useState(organization.tags)

  return (
    <section>
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">Info</h1>
      <form
        className={`${panelClass} space-y-4 p-5`}
        onSubmit={(event) => void saveOrganization(event)}
      >
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            className={`${inputClass} mt-2`}
            defaultValue={organization.name}
            required
          />
        </label>
        <TagPicker
          options={clubTagOptions}
          selected={tags}
          onChange={setTags}
          name="tags"
          showLabel
        />
        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            className={`${inputClass} mt-2`}
            rows={4}
            defaultValue={organization.description || ''}
          />
        </label>
        <label className="block text-sm font-medium">
          Website
          <input
            name="profile"
            type="url"
            className={`${inputClass} mt-2`}
            defaultValue={organization.profile || ''}
            placeholder="https://"
          />
        </label>
        <fieldset className="border-t border-line pt-4">
          <legend className="pr-2 text-sm font-semibold">Images</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['icon', 'Icon', /logo|icon/i, 'h-16 w-16'],
                ['banner', 'Banner', /banner|cover/i, 'h-16 w-full'],
              ] as const
            ).map(([name, label, type, size]) => {
              const asset = organization.assets?.find((asset) =>
                type.test(asset.type),
              )
              return (
                <div key={name} className="space-y-2">
                  <ImageUpload name={name} label={label} />
                  {asset && (
                    <img
                      src={mediaUrl(asset.link)}
                      alt={`Current club ${name}`}
                      className={`${size} rounded-md object-cover`}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            JPEG, PNG, or WebP up to 5 MB each.
          </p>
        </fieldset>
        <label className="block text-sm font-medium">
          Membership dues ($)
          <input
            name="membershipFee"
            type="number"
            min="0"
            step="0.01"
            className={`${inputClass} mt-2`}
            defaultValue={organization.membershipFee || 0}
          />
        </label>
        <div className="flex justify-end border-t border-line pt-4">
          <button className={buttonClass} disabled={saving}>
            Save
          </button>
        </div>
      </form>
    </section>
  )
}
