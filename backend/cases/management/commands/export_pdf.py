from django.core.management.base import BaseCommand, CommandError

from cases.models import Case
from cases.pdf import render_case_pdf


class Command(BaseCommand):
    help = 'Export a case timeline to a PDF file via WeasyPrint.'

    def add_arguments(self, parser):
        parser.add_argument('case_id', type=int, help='Primary key of the Case to export.')
        parser.add_argument(
            '--output',
            default=None,
            help='Output file path (default: case_<id>_timeline.pdf in current directory).',
        )

    def handle(self, *args, **options):
        case_id = options['case_id']
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            raise CommandError(f'Case with id={case_id} does not exist.')

        output_path = options['output'] or f'case_{case_id}_timeline.pdf'
        pdf_bytes = render_case_pdf(case)

        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)

        self.stdout.write(
            self.style.SUCCESS(
                f'PDF written to {output_path}  '
                f'({case.events.count()} events for {case.claimant_name})'
            )
        )
