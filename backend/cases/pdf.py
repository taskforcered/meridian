from weasyprint import HTML
from django.template.loader import render_to_string


def render_case_pdf(case) -> bytes:
    events = case.events.order_by('event_date').select_related('source_document')
    html_string = render_to_string('pdf/timeline.html', {
        'case': case,
        'events': events,
    })
    return HTML(string=html_string).write_pdf()
