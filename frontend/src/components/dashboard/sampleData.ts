import type { ProfileDetails, WorkspaceSnapshot } from './types'

// Clearly labelled UI fixture, not query results. No contact details, exact
// locations, presumed verification, arbitrary match score or user statistics.
export const sampleProfile: ProfileDetails = {
  program: 'Computer Science', year: 'Second year',
  courses: ['CPSC 210', 'MATH 221'], interests: ['Photography', 'Hiking', 'Board games'],
  teach: ['Python', 'UI design'], learn: ['Statistics', 'Beginner guitar'],
  preference: 'Quiet study sessions · In person or online', verified: false,
}
export const sampleSnapshot: WorkspaceSnapshot = {
  mode: 'sample', profile: sampleProfile,
  people: [
    { id: 'maya', name: 'Maya Chen', initials: 'MC', program: 'Computer Science', year: 'Second year', context: 'Also taking CPSC 210. Looks for quiet Saturday study sessions and good coffee.', courses: ['CPSC 210', 'CPSC 221'], interests: ['Photography', 'Cafés'], offers: ['Java'], learns: ['Python'], preference: 'Quiet sessions · In person', invited: false },
    { id: 'samir', name: 'Samir Patel', initials: 'SP', program: 'Statistics', year: 'Third year', context: 'Enjoys exchanging practical skills and making small projects with new collaborators.', courses: ['STAT 251'], interests: ['Guitar', 'Data visualisation'], offers: ['Statistics'], learns: ['UI design'], preference: 'Online · Once a week', invited: false },
    { id: 'jordan', name: 'Jordan Lee', initials: 'JL', program: 'Design', year: 'Second year', context: 'Working on a student portfolio and would welcome constructive feedback. Interested in board games and hiking.', courses: ['DES 220'], interests: ['Board games', 'UI design'], offers: ['Portfolio design'], learns: ['Python'], preference: 'Online or in person', invited: false },
  ],
  matches: [{ id: 'match-1', personId: 'jordan', name: 'Jordan Lee', initials: 'JL', offer: 'Python', learn: 'Portfolio design', invited: false }],
  skillOffers: [],
  projectOffers: [],
  requests: [
    { id: 'request-buddy', type: 'Buddy request', personId: 'maya', personName: 'Maya Chen', initials: 'MC', context: 'CPSC 210 · Quiet study sessions', meeting: 'In person · Weekends', timestamp: '2h ago', status: 'pending' },
    { id: 'exchange-request', type: 'SkillShare exchange', personId: 'samir', personName: 'Samir Patel', initials: 'SP', context: 'Your Python ↔ Their statistics', meeting: 'Online · Once a week', timestamp: 'Yesterday', status: 'pending' },
    { id: 'project-request', type: 'Project invitation', personId: 'jordan', personName: 'Jordan Lee', initials: 'JL', context: 'Student portfolio project · Design feedback', meeting: 'Online · Flexible timing', timestamp: '2d ago', status: 'pending' },
  ],
  activities: [
    { id: 'activity-1', kind: 'Buddy', text: 'Maya accepted your study-buddy request.', time: '1h ago', unread: true },
    { id: 'activity-2', kind: 'SkillShare', text: 'Your guitar-for-statistics exchange was marked complete.', time: 'Yesterday', unread: false },
    { id: 'activity-3', kind: 'Project', text: 'A new collaborator joined your portfolio project.', time: '2d ago', unread: true },
    { id: 'activity-4', kind: 'Recommendation', text: 'Students matching your interests were found.', time: '3d ago', unread: false },
  ],
  sessions: [{ id: 'session-1', type: 'Study session', personName: 'Maya Chen', activity: 'CPSC 210 practice problems', time: 'Saturday · 2:00 PM', format: 'In person' }],
}
