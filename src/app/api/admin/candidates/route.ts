import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, createCandidate, updateCandidate, deleteCandidate } from '@/lib/server/voting';

export async function GET(request: NextRequest) {
  try {
    const candidates = await getCandidates();
    return NextResponse.json({ success: true, candidates });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, usn, postId, postName, year, semester, department, gender, photoURL, manifesto } = body;

    if (!name || !usn || !postId) {
      return NextResponse.json({ error: 'Name, USN, and Post are required.' }, { status: 400 });
    }

    const candidate = await createCandidate({
      name,
      usn,
      postId,
      postName,
      year: year || '3rd Year',
      semester: semester || '6th',
      department: department || '',
      gender: gender === 'Female' ? 'Female' : 'Male',
      photoURL: photoURL || '',
      manifesto: manifesto || '',
    });

    return NextResponse.json({ success: true, candidate, message: 'Candidate added successfully.' });
  } catch (error: any) {
    console.error('Error creating candidate:', error);
    return NextResponse.json({ error: error.message || 'Failed to create candidate' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'Candidate ID and updates are required.' }, { status: 400 });
    }

    await updateCandidate(id, updates);
    return NextResponse.json({ success: true, message: 'Candidate updated successfully.' });
  } catch (error: any) {
    console.error('Error updating candidate:', error);
    return NextResponse.json({ error: error.message || 'Failed to update candidate' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Candidate ID is required.' }, { status: 400 });
    }

    await deleteCandidate(id);
    return NextResponse.json({ success: true, message: 'Candidate deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete candidate' }, { status: 500 });
  }
}
