document.addEventListener("DOMContentLoaded", function () {
  const postsContainer = document.getElementById("posts-container");
  const subredditInput = document.getElementById("subreddit-input");
  const loadButton = document.getElementById("load-button");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");

  let currentSubreddit = "all";
  let after = null;
  let before = null;
  let currentPosts = [];
  // Add variables to track comment viewing state
  let viewingComments = false;
  let currentPostId = null;
  let currentPostPermalink = null;

  // Add event listener for Enter key in subreddit input
  subredditInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      loadButton.click();
    }
  });

  loadButton.addEventListener("click", function () {
    currentSubreddit = subredditInput.value.trim();
    if (currentSubreddit) {
      // Reset comments view when loading new subreddit
      viewingComments = false;
      fetchPosts(currentSubreddit);
    }
  });

  prevButton.addEventListener("click", function () {
    // If viewing comments, go back to posts
    if (viewingComments) {
      viewingComments = false;
      fetchPosts(currentSubreddit);
    } else if (before) {
      fetchPosts(currentSubreddit, null, before);
    }
  });

  nextButton.addEventListener("click", function () {
    // Only navigate to next page if not viewing comments
    if (!viewingComments && after) {
      fetchPosts(currentSubreddit, after);
    }
  });

  function fetchPosts(subreddit, afterParam = null, beforeParam = null) {
    postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
    prevButton.disabled = true;
    nextButton.disabled = true;

    // Reduce limit to 5 posts for faster loading on Kindle
    let url = `https://www.reddit.com/r/${subreddit}.json?limit=5`;
    if (afterParam) {
      url += `&after=${afterParam}`;
    }
    if (beforeParam) {
      url += `&before=${beforeParam}`;
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        displayPosts(data.data);
      })
      .catch((error) => {
        postsContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
      });
  }

  // Add new function to fetch comments
  function fetchComments(permalink) {
    postsContainer.innerHTML = '<div class="loading">Loading comments...</div>';
    prevButton.disabled = false; // Enable back button
    nextButton.disabled = true; // Disable next button when viewing comments

    const url = `https://www.reddit.com${permalink}.json`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        displayComments(data);
      })
      .catch((error) => {
        postsContainer.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
      });
  }

  function displayPosts(data) {
    postsContainer.innerHTML = "";
    currentPosts = data.children;

    if (currentPosts.length === 0) {
      postsContainer.innerHTML = '<div class="loading">No posts found</div>';
      return;
    }

    after = data.after;
    before = data.before;

    prevButton.disabled = !before;
    nextButton.disabled = !after;

    const currentSubredditDisplay = document.createElement("div");
    currentSubredditDisplay.textContent = "r/" + currentSubreddit;
    currentSubredditDisplay.style.textAlign = "center";
    currentSubredditDisplay.style.fontWeight = "bold";
    currentSubredditDisplay.style.marginBottom = "15px";
    currentSubredditDisplay.style.fontSize = "18px";
    postsContainer.appendChild(currentSubredditDisplay);

    currentPosts.forEach((post) => {
      const postData = post.data;
      const postElement = document.createElement("div");
      postElement.className = "post";

      const title = document.createElement("div");
      title.className = "post-title";
      title.textContent = postData.title;

      const info = document.createElement("div");
      info.className = "post-info";
      info.textContent = `u/${postData.author} • ${formatScore(
        postData.score
      )} points • ${formatComments(postData.num_comments)}`;

      const content = document.createElement("div");
      content.className = "post-content";

      // If post has text content (selftext), truncate to 150 chars for Kindle
      if (postData.selftext) {
        content.textContent = truncateText(postData.selftext, 150);
      }

      // Only show small images and skip very large ones that might crash the Kindle browser
      if (
        postData.thumbnail &&
        postData.thumbnail !== "self" &&
        postData.thumbnail !== "default" &&
        postData.thumbnail !== "nsfw"
      ) {
        const img = document.createElement("img");
        img.src = postData.thumbnail;
        img.alt = postData.title;
        img.style.maxWidth = "100%";
        content.appendChild(img);
      }

      postElement.appendChild(title);
      postElement.appendChild(info);

      // Only add content div if it has something to show
      if (
        postData.selftext ||
        (postData.thumbnail &&
          postData.thumbnail !== "self" &&
          postData.thumbnail !== "default" &&
          postData.thumbnail !== "nsfw")
      ) {
        postElement.appendChild(content);
      }

      // Add view comments button
      const commentsButton = document.createElement("button");
      commentsButton.textContent = `View ${formatComments(
        postData.num_comments
      )}`;
      commentsButton.style.width = "100%";
      commentsButton.style.marginTop = "10px";

      commentsButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent opening Reddit in browser
        viewingComments = true;
        currentPostId = postData.id;
        currentPostPermalink = postData.permalink;
        fetchComments(postData.permalink);
      });

      postElement.appendChild(commentsButton);

      // Make post clickable to open in reddit
      postElement.addEventListener("click", function () {
        window.location.href = `https://www.reddit.com${postData.permalink}`;
      });
      postElement.style.cursor = "pointer";

      postsContainer.appendChild(postElement);
    });
  }

  // Add new function to display comments
  function displayComments(data) {
    postsContainer.innerHTML = "";

    if (!data || data.length < 2) {
      postsContainer.innerHTML = '<div class="loading">No comments found</div>';
      return;
    }

    // Post data is in first element of the array
    const postData = data[0].data.children[0].data;
    // Comments are in second element
    const comments = data[1].data.children;

    // Create back button
    const backButton = document.createElement("button");
    backButton.textContent = "← Back to Posts";
    backButton.style.width = "100%";
    backButton.style.marginBottom = "15px";
    backButton.style.padding = "10px";

    backButton.addEventListener("click", function () {
      viewingComments = false;
      fetchPosts(currentSubreddit);
    });

    postsContainer.appendChild(backButton);

    // Display post title and content
    const postTitle = document.createElement("div");
    postTitle.className = "post-title";
    postTitle.textContent = postData.title;
    postTitle.style.padding = "10px";
    postTitle.style.borderBottom = "1px solid black";
    postsContainer.appendChild(postTitle);

    const postInfo = document.createElement("div");
    postInfo.className = "post-info";
    postInfo.textContent = `u/${postData.author} • ${formatScore(
      postData.score
    )} points`;
    postInfo.style.padding = "5px 10px";
    postsContainer.appendChild(postInfo);

    if (postData.selftext) {
      const postContent = document.createElement("div");
      postContent.className = "post-content";
      postContent.textContent = truncateText(postData.selftext, 300);
      postContent.style.padding = "10px";
      postContent.style.borderBottom = "1px solid #ccc";
      postsContainer.appendChild(postContent);
    }

    // Comments heading
    const commentsHeading = document.createElement("div");
    commentsHeading.textContent = "Comments";
    commentsHeading.style.fontSize = "18px";
    commentsHeading.style.fontWeight = "bold";
    commentsHeading.style.margin = "15px 0 10px 10px";
    postsContainer.appendChild(commentsHeading);

    // Show comments in threads
    const commentsContainer = document.createElement("div");
    commentsContainer.className = "comments-container";
    postsContainer.appendChild(commentsContainer);

    // Render top-level comments with their replies
    let renderedComments = 0;
    const maxTopLevelComments = 8; // Limit top level comments for performance

    for (let i = 0; i < comments.length; i++) {
      if (renderedComments >= maxTopLevelComments) break;

      // Skip non-comment items (like "more" items)
      if (comments[i].kind !== "t1") continue;

      const commentData = comments[i].data;

      // Skip deleted/removed comments
      if (commentData.body === "[removed]" || commentData.body === "[deleted]")
        continue;

      renderedComments++;

      // Render the comment tree starting from this top level comment
      renderCommentThread(commentData, commentsContainer, 0);
    }

    // Show message if there are more comments
    if (comments.length > renderedComments) {
      const moreComments = document.createElement("div");
      moreComments.textContent = `${
        comments.length - renderedComments
      } more comments...`;
      moreComments.style.textAlign = "center";
      moreComments.style.margin = "15px 0";
      moreComments.style.fontStyle = "italic";
      postsContainer.appendChild(moreComments);
    }

    // Add link to view on Reddit
    const redditLink = document.createElement("a");
    redditLink.textContent = "View full discussion on Reddit";
    redditLink.href = `https://www.reddit.com${currentPostPermalink}`;
    redditLink.style.display = "block";
    redditLink.style.textAlign = "center";
    redditLink.style.margin = "20px 0";
    redditLink.style.padding = "10px";
    redditLink.style.backgroundColor = "#f0f0f0";
    redditLink.style.borderRadius = "4px";
    postsContainer.appendChild(redditLink);
  }

  // New function to render comment threads recursively
  function renderCommentThread(commentData, container, depth) {
    // Create comment element
    const commentElement = document.createElement("div");
    commentElement.className = "comment";
    commentElement.style.marginBottom = "10px";
    commentElement.style.padding = "10px";
    commentElement.style.border = "1px solid #ccc";
    commentElement.style.backgroundColor = "white";

    // Add indentation based on depth
    if (depth > 0) {
      commentElement.style.marginLeft = Math.min(depth * 15, 45) + "px";
      commentElement.style.borderLeft = "3px solid #ccc";
    }

    // Comment header with author and score
    const commentHeader = document.createElement("div");
    commentHeader.className = "comment-header";
    commentHeader.textContent = `u/${commentData.author} • ${formatScore(
      commentData.score
    )} points`;
    commentHeader.style.fontWeight = "bold";
    commentHeader.style.marginBottom = "5px";
    commentHeader.style.fontSize = depth > 0 ? "14px" : "16px";
    commentElement.appendChild(commentHeader);

    // Comment body
    const commentBody = document.createElement("div");
    commentBody.className = "comment-body";
    commentBody.textContent = truncateText(
      commentData.body,
      depth > 0 ? 150 : 250
    );
    commentBody.style.fontSize = depth > 0 ? "14px" : "16px";
    commentElement.appendChild(commentBody);

    // Handle replies
    if (
      commentData.replies &&
      commentData.replies.data &&
      commentData.replies.data.children &&
      commentData.replies.data.children.length > 0
    ) {
      const replies = commentData.replies.data.children;
      const validReplies = replies.filter(
        (r) =>
          r.kind === "t1" &&
          r.data.body !== "[removed]" &&
          r.data.body !== "[deleted]"
      );

      if (validReplies.length > 0) {
        // Create collapsible container for replies
        const repliesContainer = document.createElement("div");
        repliesContainer.className = "replies-container";
        repliesContainer.style.display = depth > 1 ? "none" : "block"; // Auto-collapse deep threads

        // Toggle button for expanding/collapsing
        const toggleReplies = document.createElement("button");
        toggleReplies.className = "toggle-replies";
        toggleReplies.textContent =
          depth > 1
            ? `Show ${validReplies.length} ${
                validReplies.length === 1 ? "reply" : "replies"
              }`
            : "Hide replies";
        toggleReplies.style.fontSize = "14px";
        toggleReplies.style.padding = "5px";
        toggleReplies.style.marginTop = "5px";
        toggleReplies.style.backgroundColor = "transparent";
        toggleReplies.style.border = "1px solid #ccc";

        toggleReplies.addEventListener("click", function () {
          const isHidden = repliesContainer.style.display === "none";
          repliesContainer.style.display = isHidden ? "block" : "none";
          toggleReplies.textContent = isHidden
            ? "Hide replies"
            : `Show ${validReplies.length} ${
                validReplies.length === 1 ? "reply" : "replies"
              }`;
        });

        commentElement.appendChild(toggleReplies);
        commentElement.appendChild(repliesContainer);

        // Render replies, but limit depth and number for performance
        const maxReplies = depth === 0 ? 5 : 3;
        const maxDepth = 3;

        if (depth < maxDepth) {
          for (let i = 0; i < Math.min(validReplies.length, maxReplies); i++) {
            renderCommentThread(
              validReplies[i].data,
              repliesContainer,
              depth + 1
            );
          }

          // Show "more replies" message if needed
          if (validReplies.length > maxReplies) {
            const moreReplies = document.createElement("div");
            moreReplies.textContent = `${
              validReplies.length - maxReplies
            } more replies...`;
            moreReplies.style.marginLeft =
              Math.min((depth + 1) * 15, 45) + "px";
            moreReplies.style.fontStyle = "italic";
            moreReplies.style.fontSize = "14px";
            moreReplies.style.marginTop = "5px";
            repliesContainer.appendChild(moreReplies);
          }
        } else if (validReplies.length > 0) {
          // At max depth, just show a message about more replies
          const continueThread = document.createElement("div");
          continueThread.textContent = `Thread continues with ${
            validReplies.length
          } more ${validReplies.length === 1 ? "reply" : "replies"}...`;
          continueThread.style.marginLeft =
            Math.min((depth + 1) * 15, 45) + "px";
          continueThread.style.fontStyle = "italic";
          continueThread.style.fontSize = "14px";
          continueThread.style.marginTop = "5px";
          repliesContainer.appendChild(continueThread);
        }
      }
    }

    container.appendChild(commentElement);
  }

  function truncateText(text, maxLength) {
    // Remove markdown for cleaner display
    text = text.replace(/\*\*|__|\*|_|~~|#|>|`/g, "");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  }

  function formatScore(score) {
    if (score >= 1000) {
      return (score / 1000).toFixed(1) + "k";
    }
    return score;
  }

  function formatComments(comments) {
    if (comments === 1) {
      return "1 comment";
    }
    return comments + " comments";
  }

  // Initial load
  fetchPosts(currentSubreddit);
});
