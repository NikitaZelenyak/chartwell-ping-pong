"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isPostReaction,
  type PostActionState,
  type ReactionActionResult,
  validateCommentInput,
  validatePostInput,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to do that.");
  }

  return { supabase, user };
}

function cleanId(value: FormDataEntryValue | null) {
  const id = String(value ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function postPayload(input: Extract<ReturnType<typeof validatePostInput>, { ok: true }>) {
  return {
    body: input.value.body,
    video_url: input.value.video?.url ?? null,
    video_provider: input.value.video?.provider ?? null,
    video_key: input.value.video?.key ?? null,
  };
}

function revalidatePostRoutes(postId?: string | null) {
  revalidatePath("/protected/posts");
  if (postId) {
    revalidatePath(`/protected/posts/${postId}`);
  }
}

export async function createPost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const input = validatePostInput(formData.get("body"), formData.get("video_url"));

  if (!input.ok) {
    return { ok: false, fieldErrors: input.fieldErrors };
  }

  try {
    const { supabase, user } = await getCurrentUser();
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        ...postPayload(input),
      })
      .select("id")
      .single();

    if (error) {
      return {
        ok: false,
        fieldErrors: { form: error.message },
      };
    }

    revalidatePostRoutes(data.id);
    return {
      ok: true,
      message: "Your post is live.",
      postId: data.id,
    };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: {
        form: error instanceof Error ? error.message : "Could not publish this post.",
      },
    };
  }
}

export async function updatePost(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = cleanId(formData.get("post_id"));
  const input = validatePostInput(formData.get("body"), formData.get("video_url"));

  if (!postId) {
    return { ok: false, fieldErrors: { form: "This post could not be found." } };
  }

  if (!input.ok) {
    return { ok: false, fieldErrors: input.fieldErrors };
  }

  try {
    const { supabase, user } = await getCurrentUser();
    const { data, error } = await supabase
      .from("posts")
      .update(postPayload(input))
      .eq("id", postId)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        fieldErrors: {
          form: error?.message ?? "Only the author can edit this post.",
        },
      };
    }

    revalidatePostRoutes(postId);
    return { ok: true, message: "Post updated.", postId };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: {
        form: error instanceof Error ? error.message : "Could not update this post.",
      },
    };
  }
}

export async function deletePost(formData: FormData) {
  const postId = cleanId(formData.get("post_id"));

  if (!postId) {
    throw new Error("This post could not be found.");
  }

  const { supabase, user } = await getCurrentUser();
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePostRoutes(postId);
  redirect("/protected/posts");
}

export async function createComment(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = cleanId(formData.get("post_id"));
  const input = validateCommentInput(formData.get("body"));

  if (!postId) {
    return { ok: false, fieldErrors: { form: "This post could not be found." } };
  }

  if (!input.ok) {
    return { ok: false, fieldErrors: { body: input.error } };
  }

  try {
    const { supabase, user } = await getCurrentUser();
    const { error } = await supabase.from("post_comments").insert({
      author_id: user.id,
      post_id: postId,
      body: input.value,
    });

    if (error) {
      return { ok: false, fieldErrors: { form: error.message } };
    }

    revalidatePostRoutes(postId);
    return { ok: true, message: "Comment posted.", postId };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: {
        form: error instanceof Error ? error.message : "Could not post this comment.",
      },
    };
  }
}

export async function updateComment(
  _previousState: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const postId = cleanId(formData.get("post_id"));
  const commentId = cleanId(formData.get("comment_id"));
  const input = validateCommentInput(formData.get("body"));

  if (!postId || !commentId) {
    return { ok: false, fieldErrors: { form: "This comment could not be found." } };
  }

  if (!input.ok) {
    return { ok: false, fieldErrors: { body: input.error } };
  }

  try {
    const { supabase, user } = await getCurrentUser();
    const { data, error } = await supabase
      .from("post_comments")
      .update({ body: input.value })
      .eq("id", commentId)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        fieldErrors: {
          form: error?.message ?? "Only the author can edit this comment.",
        },
      };
    }

    revalidatePostRoutes(postId);
    return { ok: true, message: "Comment updated.", postId };
  } catch (error) {
    return {
      ok: false,
      fieldErrors: {
        form: error instanceof Error ? error.message : "Could not update this comment.",
      },
    };
  }
}

export async function deleteComment(formData: FormData) {
  const postId = cleanId(formData.get("post_id"));
  const commentId = cleanId(formData.get("comment_id"));

  if (!postId || !commentId) {
    throw new Error("This comment could not be found.");
  }

  const { supabase, user } = await getCurrentUser();
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePostRoutes(postId);
}

export async function togglePostReaction(
  postId: string,
  reaction: string,
): Promise<ReactionActionResult> {
  if (!cleanIdValue(postId) || !isPostReaction(reaction)) {
    return {
      ok: false,
      pingCount: 0,
      pongCount: 0,
      currentReaction: null,
      message: "That reaction could not be saved.",
    };
  }

  try {
    const { supabase } = await getCurrentUser();
    const { data, error } = await supabase.rpc("toggle_post_reaction", {
      p_post_id: postId,
      p_reaction: reaction,
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (error || !row) {
      return {
        ok: false,
        pingCount: 0,
        pongCount: 0,
        currentReaction: null,
        message: error?.message ?? "That reaction could not be saved.",
      };
    }

    revalidatePostRoutes(postId);
    return {
      ok: true,
      pingCount: Number(row.ping_count ?? 0),
      pongCount: Number(row.pong_count ?? 0),
      currentReaction: isPostReaction(row.current_reaction)
        ? row.current_reaction
        : null,
    };
  } catch (error) {
    return {
      ok: false,
      pingCount: 0,
      pongCount: 0,
      currentReaction: null,
      message: error instanceof Error ? error.message : "That reaction could not be saved.",
    };
  }
}

function cleanIdValue(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}
