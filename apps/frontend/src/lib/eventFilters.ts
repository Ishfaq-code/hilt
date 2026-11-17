export const eventCategoryOptions = [
  'Arts',
  'Business',
  'Careers',
  'Culture',
  'Design',
  'Environment',
  'Fitness',
  'Food',
  'Gaming',
  'Health',
  'Music',
  'Outdoors',
  'Science',
  'Service',
  'Sports',
  'Technology',
]

export const eventTagOptions = [
  'Competition',
  'Conference',
  'Exhibition',
  'Film',
  'Fundraiser',
  'Hackathon',
  'Meeting',
  'Networking',
  'Outdoors',
  'Performance',
  'Social',
  'Sports',
  'Volunteering',
  'Workshop',
]

export const eventDateOptions = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'custom', label: 'Choose dates' },
]

function dateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function eventDirectoryQuery(
  filters: URLSearchParams,
  now = new Date(),
) {
  const query = new URLSearchParams({ sort: filters.get('sort') || 'soonest' })
  const search = filters.get('q')?.trim()
  if (search) query.set('search', search)
  filters
    .getAll('category')
    .forEach((tag) => query.append('eventCategory', tag))
  filters.getAll('type').forEach((tag) => query.append('eventTag', tag))

  const when = filters.get('when') || 'any'
  const start = new Date(now)
  const end = new Date(now)

  switch (when) {
    case 'today':
      break
    case 'tomorrow':
      start.setDate(start.getDate() + 1)
      end.setDate(end.getDate() + 1)
      break
    case 'weekend': {
      const daysUntilSaturday =
        now.getDay() === 0 ? 0 : (6 - now.getDay() + 7) % 7
      start.setDate(start.getDate() + daysUntilSaturday)
      end.setTime(start.getTime())
      end.setDate(end.getDate() + (now.getDay() === 0 ? 0 : 1))
      break
    }
    case 'week':
      end.setDate(end.getDate() + 6)
      break
    case 'custom':
      if (filters.get('from')) query.set('dateFrom', filters.get('from')!)
      if (filters.get('to')) query.set('dateTo', filters.get('to')!)
      return query.toString()
    default:
      return query.toString()
  }

  query.set('dateFrom', dateString(start))
  query.set('dateTo', dateString(end))
  return query.toString()
}
