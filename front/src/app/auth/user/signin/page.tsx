import UserSignInContainer from "@/components/Auth/user/UserSignInContainer";

// Wrapper kept minimal — the container now owns its own full-screen layout
// (plain white background, card, etc.), so this page is just a passthrough.
export default function Page() {
    return <UserSignInContainer />;
}
