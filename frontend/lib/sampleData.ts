import { TimelineEvent } from './types';

export const SAMPLE_EVENTS: TimelineEvent[] = [
  {
    id: 1,
    case: 1,
    source_document: 1,
    event_date: '2024-01-14',
    provider_name: '',
    description:
      'Motor vehicle accident — reported date of injury. Rear-end collision at highway speed.',
    source_page: null,
    citation_text: '',
    flags: ['causation_relevant'],
  },
  {
    id: 2,
    case: 1,
    source_document: 1,
    event_date: '2024-01-15',
    provider_name: 'Dr. A. Rivera, MD — Emergency Medicine',
    description:
      'Emergency department presentation for acute lower back pain following MVA. ' +
      'Diagnosis: lumbar strain causally related to the motor vehicle accident. ' +
      'NSAID therapy initiated; physical therapy referral placed.',
    source_page: 1,
    citation_text:
      'Chief Complaint: Acute lower back pain following MVA on 2024-01-14. ' +
      'Assessment: Lumbar strain, causally related to the motor vehicle accident.',
    flags: ['causation_relevant'],
  },
  {
    id: 3,
    case: 1,
    source_document: 1,
    event_date: '2024-01-22',
    provider_name: 'Riverside Physical Therapy',
    description:
      'Initial physical therapy evaluation. 3x/week lumbar-stabilization program initiated (12 sessions).',
    source_page: 3,
    citation_text:
      'Patient referred from ED for MVA-related lumbar strain. Initial evaluation completed; ' +
      'plan: 12 sessions lumbar stabilization.',
    flags: ['causation_relevant'],
  },
  {
    id: 4,
    case: 1,
    source_document: 2,
    event_date: '2024-02-10',
    provider_name: 'Dr. K. Patel, MD — Orthopedic Surgery',
    description:
      'Orthopedic follow-up. Ongoing lower back pain with limited range of motion. ' +
      'MRI lumbar spine ordered. No documented prior history of back injury.',
    source_page: 1,
    citation_text:
      'Patient reports ongoing lower back pain. MRI ordered. ' +
      'No prior history of back injury documented in chart.',
    flags: ['causation_relevant'],
  },
  {
    id: 5,
    case: 1,
    source_document: 2,
    event_date: '2024-02-18',
    provider_name: 'Metropolitan Imaging Center',
    description:
      'MRI lumbar spine: L4–L5 disc herniation with mild L5 nerve root impingement. ' +
      'Findings consistent with traumatic onset given patient age and absence of prior imaging.',
    source_page: 4,
    citation_text:
      'MRI lumbar spine: L4-L5 disc herniation, mild L5 nerve root impingement. ' +
      'Clinical correlation required.',
    flags: ['causation_relevant'],
  },
  {
    id: 6,
    case: 1,
    source_document: 3,
    event_date: '2024-03-05',
    provider_name: 'Dr. K. Patel, MD — Orthopedic Surgery',
    description:
      'MRI results reviewed. Surgical vs. conservative options discussed. ' +
      'Patient elects continued conservative management.',
    source_page: 2,
    citation_text:
      'MRI reviewed. L4-L5 herniation. Conservative management continued; ' +
      'surgery deferred per patient preference.',
    flags: ['causation_relevant'],
  },
  {
    id: 7,
    case: 1,
    source_document: 4,
    event_date: '2024-04-20',
    provider_name: 'Riverside Physical Therapy',
    description:
      'Last recorded PT session before a 6-week gap in treatment records. ' +
      'Reason for gap not documented in the chart.',
    source_page: 8,
    citation_text: 'Session 18 completed. Next appointment not scheduled per patient request.',
    flags: ['treatment_gap'],
  },
  {
    id: 8,
    case: 1,
    source_document: 5,
    event_date: '2024-05-30',
    provider_name: 'Dr. M. Chen, MD — Primary Care',
    description:
      'PCP visit for unrelated URI. Note references "chronic low back pain" as pre-existing — ' +
      'conflicts with ED record showing no prior history of back injury.',
    source_page: 1,
    citation_text: 'PMH: chronic lower back pain (onset ~2021). Current complaint: URI.',
    flags: ['pre_existing_condition', 'record_conflict'],
  },
  {
    id: 9,
    case: 1,
    source_document: 6,
    event_date: '2024-06-15',
    provider_name: 'Riverside Physical Therapy',
    description:
      'Physical therapy resumed after 6-week gap. Patient reports increased pain during hiatus.',
    source_page: 1,
    citation_text: 'Patient returns after break. Subjective: increased pain. Objective: reduced lumbar ROM.',
    flags: ['causation_relevant', 'treatment_gap'],
  },
];
