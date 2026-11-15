import type { Organization } from '../../types'
import { buttonClass, inputClass, panelClass } from '../ui/styles'

import type { OrganizationManagement } from '../../hooks/useOrganizationManagement'

type Props = Pick<OrganizationManagement, 'saveOrganization' | 'saving'> & {
  organization: Organization
}

export function OrganizationInfo({
  organization,
  saveOrganization,
  saving,
}: Props) {
  return (
    <section>
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">Info</h1>
      <form
        className={`${panelClass} space-y-4 p-5`}
        onSubmit={(event) => void saveOrganization(event)}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block text-sm font-medium">
            Name
            <input
              name="name"
              className={`${inputClass} mt-2`}
              defaultValue={organization.name}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Category
            <select
              name="category"
              className={`${inputClass} mt-2`}
              defaultValue={organization.category || 'General'}
            >
              {[
                'Technology',
                'Outdoors',
                'Arts',
                'Culture',
                'Academic',
                'Community',
                'General',
              ].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>
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
            <label className="block text-sm font-medium">
              Icon URL
              <input
                name="logo"
                type="url"
                className={`${inputClass} mt-2`}
                defaultValue={
                  organization.assets?.find(
                    (asset) => asset.type.toLowerCase() === 'logo',
                  )?.link || ''
                }
                placeholder="https://"
              />
            </label>
            <label className="block text-sm font-medium">
              Banner URL
              <input
                name="banner"
                type="url"
                className={`${inputClass} mt-2`}
                defaultValue={
                  organization.assets?.find(
                    (asset) => asset.type.toLowerCase() === 'banner',
                  )?.link || ''
                }
                placeholder="https://"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            Use a public image link. Images appear in organization discovery and
            details.
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
