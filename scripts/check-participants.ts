import { prisma } from '../lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        include: { participant: true },
        orderBy: { email: 'asc' },
    });

    console.log('--- ALL USERS ---');
    for (const u of users) {
        console.log(
            `${u.email} | role=${u.role} | hasParticipantRow=${u.participant ? 'YES (' + u.participant.fullName + ')' : 'NO'}`
        );
    }

    console.log('\n--- PROBLEM ACCOUNTS (role=PARTICIPANT but no Participant row) ---');
    const broken = users.filter((u) => u.role === 'PARTICIPANT' && !u.participant);
    if (broken.length === 0) {
        console.log('None found.');
    } else {
        for (const u of broken) {
            console.log(u.email, u.id);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());