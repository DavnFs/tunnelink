import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import MainContent from "./components/layout/MainContent";
import Settings from "./components/layout/Settings";
import ProfileForm from "./components/profile/ProfileForm";
import { ToastProvider } from "./components/ui/ToastProvider";
import ToastContainer from "./components/ui/Toast";
import { useToast } from "./hooks/useToast";
import { useProfiles } from "./hooks/useProfiles";
import { useTunnels } from "./hooks/useTunnels";
import type {
  CreateForwardRuleRequest,
  CreateProfileRequest,
  UpdateProfileRequest,
} from "./types";

function AppContent() {
  const toast = useToast();
  const [currentView, setCurrentView] = useState<"dashboard" | "settings">("dashboard");
  const {
    profiles,
    selectedProfile,
    selectedId,
    setSelectedId,
    createProfile,
    updateProfile,
    deleteProfile,
    addForwardRule,
    removeForwardRule,
    refresh,
  } = useProfiles();

  const { statuses, startTunnel, stopTunnel } = useTunnels();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const handleAddProfile = () => {
    setFormMode("create");
    setIsFormOpen(true);
  };

  const handleEditProfile = () => {
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleSaveProfile = async (
    req: CreateProfileRequest | UpdateProfileRequest
  ) => {
    try {
      if (formMode === "create") {
        await createProfile(req as CreateProfileRequest);
        toast.success("Profile created successfully");
      } else {
        await updateProfile(req as UpdateProfileRequest);
        toast.success("Profile updated");
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error(`Failed to save profile: ${err}`);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedId) return;
    if (confirm("Are you sure you want to delete this profile?")) {
      try {
        await deleteProfile(selectedId);
        toast.success("Profile deleted");
      } catch (err) {
        toast.error(`Failed to delete profile: ${err}`);
      }
    }
  };

  const handleAddRuleWrapper = async (
    profileId: string,
    rule: CreateForwardRuleRequest
  ) => {
    try {
      await addForwardRule(profileId, rule);
      toast.success("Forward rule added");
    } catch (err) {
      toast.error(`Failed to add rule: ${err}`);
      throw err;
    }
  };

  const handleRemoveRuleWrapper = async (ruleId: string) => {
    try {
      await removeForwardRule(ruleId);
      toast.success("Forward rule removed");
    } catch (err) {
      toast.error(`Failed to remove rule: ${err}`);
    }
  };

  return (
    <>
      <Sidebar
        profiles={profiles}
        selectedId={selectedId}
        statuses={statuses}
        onSelect={(id) => {
          setSelectedId(id);
          setCurrentView("dashboard");
        }}
        onAddProfile={handleAddProfile}
        onSettingsClick={() => setCurrentView("settings")}
      />
      
      {currentView === "settings" ? (
        <Settings onImportSuccess={refresh} />
      ) : (
        <MainContent
          profile={selectedProfile}
          status={selectedId ? statuses[selectedId] : undefined}
          onEdit={handleEditProfile}
          onDelete={handleDeleteProfile}
          onAddRule={handleAddRuleWrapper}
          onRemoveRule={handleRemoveRuleWrapper}
          onStartTunnel={() => selectedId && startTunnel(selectedId)}
          onStopTunnel={() => selectedId && stopTunnel(selectedId)}
        />
      )}

      {isFormOpen && (
        <ProfileForm
          profile={formMode === "edit" ? selectedProfile : null}
          onSave={handleSaveProfile}
          onCancel={() => setIsFormOpen(false)}
          onAddRule={handleAddRuleWrapper}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
      <ToastContainer />
    </ToastProvider>
  );
}
