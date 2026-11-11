import { LibraryResearch, type LibraryResearchProps } from './LibraryResearch';
import { countDistinctTaleSources } from './libraryEndmatter';

export { countDistinctTaleSources };

export type TalesInvestigationProps = LibraryResearchProps;

/** T04 is now presented as 卷末 pages inside the same 风土志 reader. */
export function TalesInvestigation(props: TalesInvestigationProps) {
  return <LibraryResearch {...props} />;
}

export default TalesInvestigation;
