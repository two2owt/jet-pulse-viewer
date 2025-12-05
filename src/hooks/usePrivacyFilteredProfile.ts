import { useMemo } from "react";

export interface PrivacySettings {
  show_birthdate: boolean;
  show_gender: boolean;
  show_pronouns: boolean;
  show_bio: boolean;
  show_instagram: boolean;
  show_twitter: boolean;
  show_facebook: boolean;
  show_linkedin: boolean;
  show_tiktok: boolean;
  show_discoverable: boolean;
}

export interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birthdate: string | null;
  gender: string | null;
  pronouns: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  privacy_settings?: PrivacySettings | null;
}

export interface FilteredProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  birthdate: string | null;
  gender: string | null;
  pronouns: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
}

const defaultPrivacySettings: PrivacySettings = {
  show_birthdate: false,
  show_gender: true,
  show_pronouns: true,
  show_bio: true,
  show_instagram: true,
  show_twitter: true,
  show_facebook: true,
  show_linkedin: true,
  show_tiktok: true,
  show_discoverable: true,
};

export function applyPrivacyFilter(
  profile: ProfileData,
  isOwnProfile: boolean = false
): FilteredProfile {
  // Own profile always shows everything
  if (isOwnProfile) {
    return {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      birthdate: profile.birthdate,
      gender: profile.gender,
      pronouns: profile.pronouns,
      instagram_url: profile.instagram_url,
      twitter_url: profile.twitter_url,
      facebook_url: profile.facebook_url,
      linkedin_url: profile.linkedin_url,
      tiktok_url: profile.tiktok_url,
    };
  }

  const settings = (profile.privacy_settings as PrivacySettings) || defaultPrivacySettings;

  return {
    id: profile.id,
    // Display name and avatar are always visible
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    // Apply privacy settings to other fields
    bio: settings.show_bio ? profile.bio : null,
    birthdate: settings.show_birthdate ? profile.birthdate : null,
    gender: settings.show_gender ? profile.gender : null,
    pronouns: settings.show_pronouns ? profile.pronouns : null,
    instagram_url: settings.show_instagram ? profile.instagram_url : null,
    twitter_url: settings.show_twitter ? profile.twitter_url : null,
    facebook_url: settings.show_facebook ? profile.facebook_url : null,
    linkedin_url: settings.show_linkedin ? profile.linkedin_url : null,
    tiktok_url: settings.show_tiktok ? profile.tiktok_url : null,
  };
}

export function usePrivacyFilteredProfile(
  profile: ProfileData | null,
  isOwnProfile: boolean = false
): FilteredProfile | null {
  return useMemo(() => {
    if (!profile) return null;
    return applyPrivacyFilter(profile, isOwnProfile);
  }, [profile, isOwnProfile]);
}
