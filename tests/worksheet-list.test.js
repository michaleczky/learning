// Unit tests for the WorksheetList component: grouping worksheets by
// subject and rendering one card per worksheet linking to its route.

import { mount } from '@vue/test-utils';
import WorksheetList from '../public/js/components/WorksheetList.js';

const worksheets = [
  { id: 'm1', subject: 'Magyar', title: 'Nyelvtan 1', grade: 2, description: 'Szószerkezetek' },
  { id: 't1', subject: 'Test', title: 'Test Worksheet', description: 'Local testing' },
  { id: 'm2', subject: 'Magyar', title: 'Nyelvtan 2', grade: 3 }
];

function mountList(list = worksheets) {
  return mount(WorksheetList, { props: { worksheets: list } });
}

describe('WorksheetList grouping', () => {
  it('renders one section per subject, in first-seen order', () => {
    const wrapper = mountList();
    const subjects = wrapper.findAll('h3').map(h => h.text());
    expect(subjects).toEqual(['Magyar', 'Test']);
  });

  it('puts each worksheet under its own subject', () => {
    const wrapper = mountList();

    const groups = wrapper.findAll('.card-list');
    const magyar = groups[0].findAll('.card');
    expect(magyar).toHaveLength(2);
    expect(magyar.map(c => c.find('.title').text())).toEqual(['Nyelvtan 1', 'Nyelvtan 2']);

    const test = groups[1].findAll('.card');
    expect(test).toHaveLength(1);
    expect(test[0].find('.title').text()).toBe('Test Worksheet');
  });

  it('keeps worksheets without a grade or description usable', () => {
    const wrapper = mountList([{ id: 'x', subject: 'Test', title: 'Bare' }]);
    const card = wrapper.find('.card');
    expect(card.find('.title').text()).toBe('Bare');
    expect(card.find('.desc').text()).toBe('');
  });
});

describe('WorksheetList card links', () => {
  it('links each card to its worksheet route', () => {
    const wrapper = mountList();
    const hrefs = wrapper.findAll('.card').map(c => c.attributes('href'));
    expect(hrefs).toEqual(['#/m1', '#/m2', '#/t1']);
  });

  it('shows the grade with the description when both are present', () => {
    const wrapper = mountList();
    const first = wrapper.findAll('.card')[0];
    expect(first.find('.desc').text()).toContain('2. osztály');
    expect(first.find('.desc').text()).toContain('Szószerkezetek');
    expect(first.find('.desc').text()).toContain('·');
  });

  it('omits the grade separator when there is no grade', () => {
    const wrapper = mountList();
    const test = wrapper.findAll('.card')[2];
    expect(test.find('.desc').text()).toBe('Local testing');
  });
});
