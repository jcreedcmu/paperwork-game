import { TextBuffer } from "./buffer";
import { State } from "./state";

export const skills = ['translation', 'cooking', 'notary', 'writing'] as const;
export type Skill = (typeof skills)[number];

export type SkillsFrame = { t: 'skills' };

export type Skills = Record<Skill, number>;  // number is the "level"

export function initSkills(): Skills {
  const rv = Object.fromEntries(skills.map(x => [x, 0])) as Skills;
  rv.writing = 1;
  return rv;
}

export function renderSkills(buf: TextBuffer, state: State, frame: SkillsFrame): void {
  buf.moveTo(0, 0);
  buf.red().bold().put(`SKILLS`);
  let row = 2;
  buf.moveTo(0, row);
  skills.forEach(skill => {
    const lev = state.inv.skills[skill];
    if (lev > 0) {
      buf.moveTo(0, row);
      buf.blue().put('' + skill).put(`: ${lev}`);
      row++;
    }
  });
  row++;
  buf.moveTo(0, row);
  buf.put('(press any key to continue)');
}
