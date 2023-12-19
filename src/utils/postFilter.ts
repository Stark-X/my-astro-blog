export const notDraftInPROD = ({ data }: { data: any }) =>
  import.meta.env.PROD ? !data.draft : true;
