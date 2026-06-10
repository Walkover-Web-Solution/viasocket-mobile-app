// navigation/types.ts
export type RootStackParamList = {
    MainTabs: undefined;
    FlowsAndFoldersList: undefined;
    FlowPreview: { flowId: string };
    FlowList: { projectId: string };
    Home: undefined;
    Flows: undefined;
    Connections: undefined;
};
