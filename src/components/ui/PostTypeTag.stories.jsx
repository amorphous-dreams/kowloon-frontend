import PostTypeTag from "./PostTypeTag.jsx";

const TYPES = ["Note", "Article", "Media", "Link", "Event"];

export default {
  title: "UI/PostTypeTag",
  component: PostTypeTag,
  argTypes: { type: { control: "select", options: TYPES } },
  args: { type: "Article" },
};

export const Default = {};

// The whole point for design work: see every type's color at once, and flip the
// toolbar Theme to light/dark to check the palette both ways.
export const AllTypes = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {TYPES.map((t) => (
        <PostTypeTag key={t} type={t} />
      ))}
    </div>
  ),
};
