// Integration tests for the SubmissionViewer component: the read-only
// teacher view opened through a student's submission link. The answers
// document is served by MSW; the viewer must never hit a real origin.

import { mount, flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import SubmissionViewer from '../public/js/components/SubmissionViewer.js';
import worksheet from '../public/data/test-worksheet.json';
import { server } from './mocks/server.js';

const answersUrl = 'https://api.npoint.io/doc1';

const submission = {
  worksheetId: 'test-worksheet',
  worksheetTitle: 'Test Worksheet',
  studentName: 'Anna',
  savedAt: '2026-09-20T10:30:00.000Z',
  answers: { '0-0': 'Yes', '0-1': 'Maybe', '1-0': '4', '2-0': 'Blue', '3-0': 'I like dogs.' }
};

function mountViewer(answersUrlOverride = answersUrl) {
  return mount(SubmissionViewer, {
    props: { worksheet, answersUrl: answersUrlOverride }
  });
}

beforeEach(() => {
  server.use(
    http.get(answersUrl, () => HttpResponse.json(submission))
  );
});

describe('SubmissionViewer loading', () => {
  it('fetches the answers document and shows the student and date', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.vm.studentName).toBe('Anna');
    expect(wrapper.vm.answers['0-0']).toBe('Yes');
    expect(wrapper.text()).toContain('Beküldte: Anna');
    expect(wrapper.text()).toContain('20.');
  });

  it('shows an error message when the document cannot be loaded', async () => {
    server.use(
      http.get(answersUrl, () => new HttpResponse(null, { status: 404 }))
    );
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.vm.error).toBe('A beküldött válaszokat nem sikerült betölteni.');
    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.task').exists()).toBe(false);
  });

  it('reloads when the answers URL changes', async () => {
    server.use(
      http.get('https://api.npoint.io/doc2', () =>
        HttpResponse.json({ ...submission, studentName: 'Péter' })
      )
    );
    const wrapper = mountViewer();
    await flushPromises();

    await wrapper.setProps({ answersUrl: 'https://api.npoint.io/doc2' });
    await flushPromises();

    expect(wrapper.vm.studentName).toBe('Péter');
  });
});

describe('SubmissionViewer rendering', () => {
  it('renders the student answers into read-only controls', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const radio = wrapper.find('input[type="radio"][value="Yes"]');
    expect(radio.element.checked).toBe(true);
    const textInput = wrapper.find('.item input[type="text"]');
    expect(textInput.element.value).toBe('4');
    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('I like dogs.');

    expect(radio.element.disabled).toBe(true);
    expect(textInput.element.disabled).toBe(true);
    expect(textarea.element.disabled).toBe(true);
    expect(wrapper.find('select.form-select').element.disabled).toBe(true);
  });

  it('shows checked feedback and the score with the result', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const items = wrapper.findAll('.item');
    expect(items[0].classes()).toContain('correct');
    expect(items[0].find('.feedback .ok').text()).toBe('Helyes.');
    expect(items[1].classes()).toContain('incorrect');
    expect(items[1].text()).toContain('Nem jó.');
    expect(items[1].text()).toContain('No');
    // Wrong select answer with the expected solution shown
    expect(items[3].text()).toContain('Nem jó.');
    expect(items[3].text()).toContain('Green');

    // 4 auto items: 2 correct; 1 open item: not self-assessed
    expect(wrapper.vm.scoreText).toBe('Helyes: 2 / 4 · önértékelt: 0 / 1');
    expect(wrapper.find('.ws-head .score').text()).toBe('Helyes: 2 / 4 · önértékelt: 0 / 1');
  });

  it('disables the self-assessment checkbox and shows the sample solution', async () => {
    const wrapper = mountViewer();
    await flushPromises();

    const openItem = wrapper.findAll('.item')[4];
    const checkbox = openItem.find('.selfcheck input');
    expect(checkbox.element.disabled).toBe(true);
    expect(openItem.find('.solution').text()).toContain('Mintamegoldás');
  });

  it('counts a self-assessed open answer in the score', async () => {
    server.use(
      http.get(answersUrl, () =>
        HttpResponse.json({ ...submission, answers: { ...submission.answers, '3-0:ok': true } })
      )
    );
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.findAll('.item')[4].find('.selfcheck input').element.checked).toBe(true);
    expect(wrapper.vm.scoreText).toBe('Helyes: 2 / 4 · önértékelt: 1 / 1');
  });
});
