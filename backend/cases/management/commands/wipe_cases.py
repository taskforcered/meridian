from django.core.management.base import BaseCommand

from cases.models import Case, SourceDocument, TimelineEvent


class Command(BaseCommand):
    help = 'Delete all Case/SourceDocument/TimelineEvent rows. Leaves users/roles untouched.'

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Skip the confirmation prompt.')

    def handle(self, *args, **options):
        case_count = Case.objects.count()
        doc_count = SourceDocument.objects.count()
        event_count = TimelineEvent.objects.count()

        if not options['yes']:
            confirm = input(
                f'This will delete {case_count} cases, {doc_count} documents, '
                f'{event_count} events. Type "yes" to continue: '
            )
            if confirm != 'yes':
                self.stdout.write('Aborted.')
                return

        # Cascades to SourceDocument and TimelineEvent via their Case FK.
        Case.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Deleted {case_count} cases, {doc_count} documents, {event_count} events.'
            )
        )
